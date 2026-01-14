import React from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import OrbVisualizer from '../components/OrbVisualizer';
import { ConnectionState } from '../types';

const Agent: React.FC = () => {
    const { connectionState, connect, disconnect, volume, error, transcript } = useGeminiLive();

    const handleToggle = () => {
        if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
            disconnect();
        } else {
            connect();
        }
    };

    const isConnected = connectionState === ConnectionState.CONNECTED;
    const isConnecting = connectionState === ConnectionState.CONNECTING;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body {
                    background: #050505;
                    color: #e8e8e8;
                    font-family: 'Inter', sans-serif;
                    overflow: hidden; /* Prevent scroll */
                }

                .agent-container {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    background: radial-gradient(circle at center, #1a1b1d 0%, #050505 100%);
                }
                
                /* Subtle Grain/Noise Overlay */
                .agent-container::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
                    opacity: 0.4;
                    pointer-events: none;
                    z-index: 1;
                }

                .ui-layer {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    padding: 2rem;
                }

                /* Header */
                .header {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .back-link {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #888890;
                    text-decoration: none;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    transition: color 0.3s ease;
                    opacity: 0.7;
                }

                .back-link:hover {
                    color: #d4c5a3;
                    opacity: 1;
                }

                .brand {
                    text-align: right;
                }

                .brand h1 {
                    font-family: 'Playfair Display', serif;
                    font-size: 1.25rem;
                    color: #e8e8e8;
                    letter-spacing: 0.05em;
                }

                .brand span {
                    display: block;
                    font-size: 0.6rem;
                    color: #d4c5a3;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    margin-top: 0.25rem;
                }

                /* Main Visualizer */
                .visualizer-container {
                    flex: 1;
                    width: 100%;
                    max-width: 800px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .orb-wrapper {
                    width: 100%;
                    height: 50vh; /* Fixed height relative to viewport */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Transcript */
                .transcript-container {
                    bottom: 2rem;
                    width: 100%;
                    text-align: center;
                    padding: 0 1rem;
                }

                .transcript {
                    font-family: 'Playfair Display', serif;
                    font-size: clamp(1.25rem, 3vw, 1.75rem);
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.4;
                    font-style: italic;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                    max-width: 800px;
                    margin: 0 auto;
                }

                .placeholder-text {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.75rem;
                    color: #57534e;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    animation: pulse 3s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.7; }
                }

                /* Controls */
                .controls {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    padding-bottom: 2rem;
                }

                .mic-button {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #e8e8e8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    position: relative;
                }

                .mic-button:hover {
                    border-color: rgba(212, 197, 163, 0.5);
                    background: rgba(212, 197, 163, 0.05);
                    transform: scale(1.05);
                }

                .mic-button.active {
                    border-color: #d4c5a3;
                    color: #d4c5a3;
                    box-shadow: 0 0 30px rgba(212, 197, 163, 0.1);
                }

                .mic-button.connecting {
                    animation: spin-border 2s linear infinite;
                    border-top-color: #d4c5a3;
                }

                @keyframes spin-border {
                    to { transform: rotate(360deg); }
                }

                .status-indicator {
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    color: #57534e;
                    transition: color 0.3s;
                }

                .status-indicator.active {
                    color: #d4c5a3;
                }

                .error-toast {
                    position: absolute;
                    top: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(127, 29, 29, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #fca5a5;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                }
            `}</style>

            <div className="agent-container">
                <div className="ui-layer">
                    {/* Header */}
                    <header className="header">
                        <a href="/" className="back-link">
                            <span>←</span> Return
                        </a>
                        <div className="brand">
                            <h1>Marcus Aurelius</h1>
                            <span>The Emperor</span>
                        </div>
                    </header>

                    {/* Main Visualizer */}
                    <div className="visualizer-container">
                        <div className="orb-wrapper">
                            <OrbVisualizer volume={volume} active={isConnected} />
                        </div>

                        <div className="transcript-container">
                            {transcript ? (
                                <p className="transcript">"{transcript}"</p>
                            ) : (
                                isConnected && volume > 10 ? (
                                    <p className="placeholder-text">Listening...</p>
                                ) : (
                                    <p className="placeholder-text">Stoic Wisdom Awaits</p>
                                )
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <footer className="controls">
                        <button
                            onClick={handleToggle}
                            className={`mic-button ${isConnected ? 'active' : ''} ${isConnecting ? 'connecting' : ''}`}
                        >
                            {isConnecting ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            ) : isConnected ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                            )}
                        </button>
                        <span className={`status-indicator ${isConnected ? 'active' : ''}`}>
                            {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Tap to Speak'}
                        </span>
                    </footer>

                    {error && <div className="error-toast">{error}</div>}
                </div>
            </div>
        </>
    );
};

export default Agent;
