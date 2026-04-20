// client/src/components/PomodoroTimer.tsx

import React, { useState, useEffect, useRef } from 'react';
import './PomodoroTimer.css';

interface PomodoroTimerProps {
  workDuration: number; // minutes
  breakDuration: number; // minutes
  autoSwitch: boolean;
  isActive: boolean;
  timerType: 'work' | 'break';
  remainingSeconds: number;
  onTimerUpdate: (state: {
    active: boolean;
    type: 'work' | 'break';
    remaining: number;
    startTime?: Date;
  }) => void;
  onTimerComplete?: (type: 'work' | 'break') => void;
  disabled?: boolean;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  workDuration,
  breakDuration,
  autoSwitch,
  isActive,
  timerType,
  remainingSeconds,
  onTimerUpdate,
  onTimerComplete,
  disabled = false
}) => {
  const [localRemaining, setLocalRemaining] = useState(remainingSeconds);
  const [localActive, setLocalActive] = useState(isActive);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Синхронизация с пропсами (только при реальном изменении)
  useEffect(() => {
    if (remainingSeconds !== localRemaining) {
      setLocalRemaining(remainingSeconds);
    }
    setLocalActive(isActive);
  }, [remainingSeconds, isActive, localRemaining]);

  // Основной таймер
  useEffect(() => {
    if (localActive && !disabled && localRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setLocalRemaining(prev => {
          const newRemaining = prev - 1;
          if (newRemaining <= 0) {
            // Таймер закончился
            if (intervalRef.current) clearInterval(intervalRef.current);
            
            // Воспроизводим звук
            playSound();
            
            // Вызываем колбэк
            if (onTimerComplete) onTimerComplete(timerType);
            
            // Если автопереключение включено
            if (autoSwitch) {
              const newType = timerType === 'work' ? 'break' : 'work';
              const newDuration = newType === 'work' ? workDuration * 60 : breakDuration * 60;
              
              onTimerUpdate({
                active: true,
                type: newType,
                remaining: newDuration,
                startTime: new Date()
              });
            } else {
              onTimerUpdate({
                active: false,
                type: timerType,
                remaining: 0,
                startTime: undefined
              });
            }
            return 0;
          }
          return newRemaining;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [localActive, disabled, timerType, workDuration, breakDuration, autoSwitch, onTimerUpdate, onTimerComplete, localRemaining]);

  // Обновляем родительский компонент при изменении оставшегося времени
  useEffect(() => {
    if (localRemaining !== remainingSeconds) {
      onTimerUpdate({
        active: localActive,
        type: timerType,
        remaining: localRemaining,
        startTime: localActive ? new Date() : undefined
      });
    }
  }, [localRemaining, localActive, timerType, onTimerUpdate, remainingSeconds]);

  const playSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/timer-end.mp3');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
      console.log('Audio not supported');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (disabled) return;
    setLocalActive(true);
    onTimerUpdate({
      active: true,
      type: timerType,
      remaining: localRemaining,
      startTime: new Date()
    });
  };

  const handlePause = () => {
    if (disabled) return;
    setLocalActive(false);
    onTimerUpdate({
      active: false,
      type: timerType,
      remaining: localRemaining,
      startTime: undefined
    });
  };

  const handleReset = () => {
    if (disabled) return;
    const newRemaining = timerType === 'work' ? workDuration * 60 : breakDuration * 60;
    setLocalRemaining(newRemaining);
    setLocalActive(false);
    onTimerUpdate({
      active: false,
      type: timerType,
      remaining: newRemaining,
      startTime: undefined
    });
  };

  const handleSwitch = () => {
    if (disabled) return;
    const newType = timerType === 'work' ? 'break' : 'work';
    const newRemaining = newType === 'work' ? workDuration * 60 : breakDuration * 60;
    setLocalRemaining(newRemaining);
    setLocalActive(false);
    onTimerUpdate({
      active: false,
      type: newType,
      remaining: newRemaining,
      startTime: undefined
    });
  };

  const progress = () => {
    const total = timerType === 'work' ? workDuration * 60 : breakDuration * 60;
    return ((total - localRemaining) / total) * 100;
  };

  return (
    <div className="pomodoro-timer">
      <div className="timer-header">
        <div className="timer-type">
          {timerType === 'work' ? '📚 Работа' : '☕ Перерыв'}
        </div>
        <div className="timer-controls">
          {!localActive ? (
            <button
              className="timer-btn timer-btn-start"
              onClick={handleStart}
              disabled={disabled || localRemaining === 0}
              title="Старт"
            >
              ▶
            </button>
          ) : (
            <button
              className="timer-btn timer-btn-pause"
              onClick={handlePause}
              disabled={disabled}
              title="Пауза"
            >
              ⏸
            </button>
          )}
          <button
            className="timer-btn timer-btn-reset"
            onClick={handleReset}
            disabled={disabled}
            title="Сброс"
          >
            ⟳
          </button>
          <button
            className="timer-btn timer-btn-switch"
            onClick={handleSwitch}
            disabled={disabled}
            title="Переключить"
          >
            ⇄
          </button>
        </div>
      </div>

      <div className="timer-circle">
        <svg className="timer-svg" viewBox="0 0 120 120">
          <circle
            className="timer-bg"
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          <circle
            className={`timer-progress ${timerType}`}
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress() / 100)}`}
            transform="rotate(-90 60 60)"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
        </svg>
        <div className="timer-time">{formatTime(localRemaining)}</div>
      </div>

      <div className="timer-settings-info">
        <div className="setting">
          <span className="setting-label">Работа:</span>
          <span className="setting-value">{workDuration} мин</span>
        </div>
        <div className="setting">
          <span className="setting-label">Перерыв:</span>
          <span className="setting-value">{breakDuration} мин</span>
        </div>
        <div className="setting">
          <span className="setting-label">Авто:</span>
          <span className="setting-value">{autoSwitch ? 'Вкл' : 'Выкл'}</span>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;