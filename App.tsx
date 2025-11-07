import React, { useState, useCallback } from 'react';
import { SURVEY_QUESTIONS } from './constants';
import QuestionCard from './components/QuestionCard';
import type { Answer, AppState } from './types';
import { CheckIcon, SpinnerIcon, DownloadIcon, AlertTriangleIcon } from './components/icons';

function App() {
    const [appState, setAppState] = useState<AppState>('welcome');
    const [userName, setUserName] = useState('');
    const [answers, setAnswers] = useState<Answer[]>(() => 
        SURVEY_QUESTIONS.map(() => ({ text: '', audioBlob: null }))
    );

    const handleUpdateAnswer = useCallback((index: number, newAnswer: Answer) => {
        setAnswers(prevAnswers => {
            const updatedAnswers = [...prevAnswers];
            updatedAnswers[index] = newAnswer;
            return updatedAnswers;
        });
    }, []);

    const handleStartSurvey = () => {
        if (userName.trim()) {
            setAppState('survey');
        }
    };
    
    const isSubmittable = answers.some(a => a.text.trim() !== '' || a.audioBlob !== null);

    const handleDownload = async () => {
      setAppState('submitting');
      try {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        // Keep Japanese (Kanji/Kana) and most Unicode; strip only invalid filename chars and control chars
        const sanitizeForFile = (name: string) =>
          name
            .trim()
            .replace(/[\x00-\x1F\\/:*?"<>|]/g, '') // remove control + invalid path chars
            .replace(/[\.\s]+$/g, ''); // trim trailing dots/spaces (Windows quirk)

        const displayName = userName.trim();
        const safeName = sanitizeForFile(displayName) || 'anonymous';
        const folderName = `振り返りアンケート_${safeName}`;
        const userFolder = zip.folder(folderName);

        if (!userFolder) {
          throw new Error("Could not create user folder in zip.");
        }

        answers.forEach((answer, index) => {
          const section = SURVEY_QUESTIONS[index];
          const fileNameBase = `#${index + 1}_${section.title.replace(/[^a-zA-Z0-9_]/g, '_')}`;

          if (answer.text.trim()) {
            userFolder.file(`${fileNameBase}.txt`, answer.text);
          }
          if (answer.audioBlob) {
            userFolder.file(`${fileNameBase}.webm`, answer.audioBlob);
          }
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `振り返りアンケート_${safeName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        setAppState('submitted');
      } catch (error) {
        console.error("Failed to generate zip file:", error);
        setAppState('error');
      }
    };
    
    if (appState === 'welcome') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                     <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                        音声振り返りアンケート
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                        始める前に、お名前を入力してください。
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleStartSurvey(); }}>
                        <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="例：山田 太郎"
                            className="w-full px-4 py-3 text-lg border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition"
                        />
                        <button
                            type="submit"
                            disabled={!userName.trim()}
                            className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg text-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-slate-400 disabled:dark:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
                        >
                            アンケートを開始する
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (appState === 'submitting' || appState === 'submitted' || appState === 'error') {
       return (
         <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 text-center">
            <div className="w-full max-w-md">
                {appState === 'submitting' && (
                    <>
                        <SpinnerIcon className="h-16 w-16 text-indigo-500 mx-auto animate-spin" />
                        <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">ダウンロードファイルを生成中...</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">しばらくお待ちください。</p>
                    </>
                )}
                {appState === 'submitted' && (
                    <>
                         <CheckIcon className="h-20 w-20 text-green-500 mx-auto" />
                         <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">ダウンロードが完了しました</h2>
                         <p className="mt-2 text-slate-600 dark:text-slate-400">ファイルがお使いのPCに保存されました。</p>
                    </>
                )}
                {appState === 'error' && (
                    <>
                        <AlertTriangleIcon className="h-20 w-20 text-red-500 mx-auto" />
                        <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">ファイルの生成に失敗しました</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">問題が発生しました。もう一度お試しください。</p>
                        <button onClick={() => setAppState('survey')} className="mt-6 bg-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-all">
                          回答画面に戻る
                        </button>
                    </>
                )}
            </div>
         </div>  
       );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
            <main className="max-w-4xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                        音声振り返りアンケート
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        回答者: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{userName}</span>
                    </p>
                </header>

                <div className="space-y-8">
                    {SURVEY_QUESTIONS.map((section, index) => (
                        <QuestionCard
                            key={index}
                            sectionIndex={index + 1}
                            title={section.title}
                            prompts={section.prompts}
                            answer={answers[index]}
                            onAnswerChange={(newAnswer) => handleUpdateAnswer(index, newAnswer)}
                        />
                    ))}
                </div>
                
                <div className="mt-12 flex justify-center">
                  <button 
                    onClick={handleDownload}
                    disabled={!isSubmittable}
                    className="flex items-center justify-center gap-3 w-full max-w-xs h-14 px-6 rounded-full font-semibold text-white text-lg transition-all duration-200 bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:bg-slate-400 disabled:dark:bg-slate-600 disabled:cursor-not-allowed"
                  >
                    <DownloadIcon className="h-6 w-6" />
                    <span>すべての回答をダウンロード</span>
                  </button>
                </div>

                <footer className="text-center mt-12 py-6 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                    <p>Powered by React & Tailwind CSS. Designed for simple and effective voice feedback.</p>
                </footer>
            </main>
        </div>
    );
}

export default App;
