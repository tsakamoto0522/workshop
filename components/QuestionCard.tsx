import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingState, Answer } from '../types';
import { MicIcon, StopIcon, PlayIcon, PauseIcon, DownloadIcon, AlertTriangleIcon } from './icons';

interface QuestionCardProps {
  sectionIndex: number;
  title: string;
  prompts: string[];
  answer: Answer;
  onAnswerChange: (newAnswer: Answer) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const QuestionCard: React.FC<QuestionCardProps> = ({ sectionIndex, title, prompts, answer, onAnswerChange }) => {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const timerIntervalRef = useRef<number | null>(null);
    
    // Create or revoke Object URL when the audio blob changes
    useEffect(() => {
        if (answer.audioBlob) {
            const url = URL.createObjectURL(answer.audioBlob);
            setAudioURL(url);
            return () => URL.revokeObjectURL(url);
        }
        setAudioURL(null);
    }, [answer.audioBlob]);

    const startTimer = useCallback(() => {
        setRecordingSeconds(0);
        timerIntervalRef.current = window.setInterval(() => {
            setRecordingSeconds(prev => prev + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, []);
    
    const cleanupMediaStream = useCallback((stream: MediaStream | null) => {
        stream?.getTracks().forEach(track => track.stop());
    }, []);

    const handleStartRecording = useCallback(async () => {
        if (recordingState === 'recording') return;
        
        // Reset previous recording
        onAnswerChange({ ...answer, audioBlob: null });
        setRecordingState('idle');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
                onAnswerChange({ ...answer, audioBlob });
                setRecordingState('stopped');
                cleanupMediaStream(stream);
            };
            
            mediaRecorderRef.current.start();
            setRecordingState('recording');
            startTimer();
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setRecordingState('permission-denied');
        }
    }, [recordingState, onAnswerChange, answer, startTimer, cleanupMediaStream]);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.stop();
            stopTimer();
        }
    }, [recordingState, stopTimer]);

    const handleTogglePlayback = useCallback(() => {
        if (audioPlayerRef.current) {
            if (recordingState === 'playing') {
                audioPlayerRef.current.pause();
                setRecordingState('stopped');
            } else if (recordingState === 'stopped' && audioURL) {
                audioPlayerRef.current.play();
                setRecordingState('playing');
            }
        }
    }, [recordingState, audioURL]);

    const handleDownload = useCallback(() => {
        if (audioURL) {
            const a = document.createElement('a');
            a.href = audioURL;
            a.download = `振り返り_${sectionIndex}_${title.replace(/[^a-zA-Z0-9_]/g, '_')}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }, [audioURL, sectionIndex, title]);

    // Effect for handling audio player
    useEffect(() => {
        if (audioURL) {
            if (!audioPlayerRef.current) {
                audioPlayerRef.current = new Audio(audioURL);
            } else {
                audioPlayerRef.current.src = audioURL;
            }
            const player = audioPlayerRef.current;
            const onEnded = () => setRecordingState('stopped');
            const onTimeUpdate = () => setPlaybackTime(player.currentTime);
            const onLoadedMetadata = () => setDuration(player.duration);

            player.addEventListener('ended', onEnded);
            player.addEventListener('timeupdate', onTimeUpdate);
            player.addEventListener('loadedmetadata', onLoadedMetadata);

            return () => {
                player.removeEventListener('ended', onEnded);
                player.removeEventListener('timeupdate', onTimeUpdate);
                player.removeEventListener('loadedmetadata', onLoadedMetadata);
            }
        }
    }, [audioURL]);


    const isRecording = recordingState === 'recording';
    const hasRecording = answer.audioBlob !== null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
                <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
                    <p>🎙️【話してほしいこと】</p>
                    <ul className="list-disc pl-5 space-y-1">
                        {prompts.map((prompt, i) => <li key={i}>{prompt}</li>)}
                    </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">回答欄（音声またはテキストで入力）</h3>
                  <textarea
                      value={answer.text}
                      onChange={(e) => onAnswerChange({ ...answer, text: e.target.value })}
                      rows={4}
                      placeholder="ここにテキストで回答を入力できます..."
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-t border-slate-200 dark:border-slate-700">
                {recordingState === 'permission-denied' && (
                     <div className="flex items-center space-x-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4">
                        <AlertTriangleIcon className="h-6 w-6 flex-shrink-0" />
                        <p className="text-sm font-medium">マイクへのアクセスが拒否されました。ブラウザの設定でマイクのアクセスを許可してください。</p>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button
                            onClick={isRecording ? handleStopRecording : handleStartRecording}
                            className={`flex items-center justify-center gap-3 w-48 h-12 px-4 rounded-full font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
                        >
                            {isRecording ? <StopIcon className="h-5 w-5"/> : <MicIcon className="h-6 w-6"/>}
                            <span>{isRecording ? '録音を停止' : '録音を開始'}</span>
                        </button>
                        {isRecording && (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-mono text-lg">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <span>{formatTime(recordingSeconds)}</span>
                            </div>
                        )}
                    </div>
                    {hasRecording && (
                        <div className="flex flex-wrap items-center gap-2">
                           <button onClick={handleTogglePlayback} className="flex items-center justify-center h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
                                {recordingState === 'playing' ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                           </button>
                           <div className="text-sm font-mono text-slate-600 dark:text-slate-400">{formatTime(playbackTime)} / {formatTime(duration)}</div>
                           <button onClick={handleDownload} className="flex items-center gap-2 px-4 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
                                <DownloadIcon className="h-5 w-5" />
                                <span>ダウンロード</span>
                           </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuestionCard;
