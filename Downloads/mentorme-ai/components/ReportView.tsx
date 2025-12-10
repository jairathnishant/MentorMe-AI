
import React, { useEffect, useState } from 'react';
import {  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeft, CheckCircle, Lightbulb, PlayCircle, Share2, Download, FileJson } from 'lucide-react';
import { SessionReport } from '../types';
import { Button } from './Button';
import { getVideoBlob } from '../services/storage';

interface ReportViewProps {
  report: SessionReport;
  onBack: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, onBack }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      if (report.videoBlobKey) {
        const blob = await getVideoBlob(report.videoBlobKey);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }
      }
    };
    loadVideo();
    
    // Cleanup
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [report.videoBlobKey]);

  // Transform data for chart
  const chartData = report.timeline.map((point, index) => ({
    time: Math.floor((point.timestamp - report.startTime) / 1000),
    focus: point.focusScore,
    posture: point.postureScore,
    lighting: point.lightingScore
  }));

  const shareViaWhatsapp = () => {
      const text = `Check out my MentorMe session report! Score: ${report.overallScore}/100. "${report.keyInsights[0]}"`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const downloadAnalysis = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `mentorme_report_${report.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const downloadVideo = () => {
      if (videoUrl) {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `mentorme_session_${report.id}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-white h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button onClick={onBack} variant="ghost" className="pl-0 hover:bg-transparent">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={downloadAnalysis}>
                <FileJson className="w-4 h-4 mr-2" /> Download Analysis
            </Button>
            <Button variant="secondary" size="sm" onClick={shareViaWhatsapp}>
                <Share2 className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Summary & Video */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl overflow-hidden border border-gray-800 shadow-xl">
                {videoUrl ? (
                    <video src={videoUrl} controls className="w-full aspect-video bg-black" />
                ) : (
                    <div className="w-full aspect-video bg-gray-900 flex items-center justify-center text-gray-500">
                        <PlayCircle className="w-12 h-12 mb-2 opacity-50" />
                        <span>Video not available</span>
                    </div>
                )}
                <div className="p-4 flex justify-between items-center">
                     <div>
                        <h2 className="text-xl font-bold mb-1 capitalize">{report.activityType} Session</h2>
                        <p className="text-gray-400 text-sm">
                            {new Date(report.startTime).toLocaleString()}
                        </p>
                     </div>
                     {videoUrl && (
                        <Button size="sm" variant="ghost" onClick={downloadVideo} title="Download Video">
                            <Download className="w-5 h-5" />
                        </Button>
                     )}
                </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-200">Overall Score</h3>
                    <span className={`text-2xl font-bold ${report.overallScore >= 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                        {report.overallScore}
                    </span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${report.overallScore >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                        style={{ width: `${report.overallScore}%` }}
                    />
                </div>
                <p className="mt-4 text-sm text-gray-400">
                    Calculated based on average posture quality, focus consistency, and environmental factors over {Math.floor(report.durationSeconds / 60)} minutes.
                </p>
            </div>
        </div>

        {/* Right Col: Analytics & Insights */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Key Insights */}
            <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 p-6 rounded-xl">
                <h3 className="flex items-center text-lg font-bold text-primary mb-4">
                    <Lightbulb className="w-5 h-5 mr-2" /> Mentor Insights
                </h3>
                <div className="space-y-4">
                    {report.keyInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold mr-3 mt-0.5">
                                {idx + 1}
                            </div>
                            <p className="text-gray-200 leading-relaxed">{insight}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts */}
            <div className="bg-card p-6 rounded-xl border border-gray-800">
                <h3 className="font-bold text-gray-200 mb-6">Performance Timeline</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="time" 
                                stroke="#9ca3af" 
                                label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} 
                            />
                            <YAxis stroke="#9ca3af" domain={[0, 10]} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                            />
                            <Line type="monotone" dataKey="posture" stroke="#0ea5e9" strokeWidth={2} name="Posture" dot={false} />
                            <Line type="monotone" dataKey="focus" stroke="#22c55e" strokeWidth={2} name="Focus" dot={false} />
                            <Line type="monotone" dataKey="lighting" stroke="#eab308" strokeWidth={2} name="Lighting" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Object Detection Log */}
            <div className="bg-card p-6 rounded-xl border border-gray-800 max-h-60 overflow-y-auto">
                 <h3 className="font-bold text-gray-200 mb-4 sticky top-0 bg-card py-2">Detection Log</h3>
                 <div className="space-y-3">
                    {report.timeline.map((point, i) => (
                        <div key={i} className="text-sm border-b border-gray-800 last:border-0 pb-2">
                            <div className="flex justify-between text-gray-500 mb-1">
                                <span>{new Date(point.timestamp).toLocaleTimeString()}</span>
                                <span className={point.safetyStatus === 'UNSAFE' ? 'text-red-500 font-bold' : 'text-green-500'}>{point.safetyStatus}</span>
                            </div>
                            <p className="text-gray-300 italic">"{point.suggestion}"</p>
                            {point.detectedObjects.length > 0 && (
                                <p className="text-xs text-gray-600 mt-1">Detected: {point.detectedObjects.join(', ')}</p>
                            )}
                        </div>
                    ))}
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};
