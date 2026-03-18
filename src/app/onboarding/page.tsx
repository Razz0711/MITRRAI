// ============================================
// MitrRAI - Onboarding Chat Page
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from '@/components/ChatInterface';
import { ChatMessage } from '@/lib/types';
import { ONBOARDING_STEPS, parseOnboardingData } from '@/lib/onboarding';
import { useAuth } from '@/lib/auth';

const TOTAL_STEPS = 9;

// Map step numbers to field names for data collection
// Name, department, yearLevel come from registration — not asked here
const STEP_FIELDS: Record<number, string> = {
  0: 'targetExam',     // user answers: what they're preparing for
  1: 'strongSubjects', // user answers: strong subjects
  2: 'weakSubjects',   // user answers: weak subjects
  3: 'studyMethod',    // user answers: study method
  4: 'sessionLength',  // user answers: session length
  5: 'schedule',       // user answers: days and times
  6: 'shortTermGoal',  // user answers: main goal
  7: 'personality',    // user answers: study style + accountability
  8: '',               // wrap up - no data to save
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userName = user?.name || 'there';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: `Hey ${userName}! Welcome to MitrRAI. I already have your basic info from registration.\n\nLet's set up your study preferences so I can find you the perfect study buddy at SVNIT!\n\nWhat are you currently preparing for?`,
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // Pre-populate with registration data so Grok knows the student's context
  const [collectedData, setCollectedData] = useState<Record<string, string>>(() => {
    if (user) {
      return {
        name: user.name,
        department: user.department,
        yearLevel: user.yearLevel,
      };
    }
    return {} as Record<string, string>;
  });
  const [isComplete, setIsComplete] = useState(false);
  const [multiSelectChoices, setMultiSelectChoices] = useState<string[]>([]);

  // Get current step config for showing option buttons
  const currentStepConfig = ONBOARDING_STEPS.find(s => s.id === currentStep);
  const hasOptions = currentStepConfig && (currentStepConfig.type === 'select' || currentStepConfig.type === 'multiselect');
  const isMultiSelect = currentStepConfig?.type === 'multiselect';

  const handleOptionSelect = (option: string) => {
    if (isMultiSelect) {
      setMultiSelectChoices(prev =>
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      );
    } else {
      // Single select - send immediately
      handleSendMessage(option);
    }
  };

  const handleMultiSelectConfirm = () => {
    if (multiSelectChoices.length > 0) {
      handleSendMessage(multiSelectChoices.join(', '));
      setMultiSelectChoices([]);
    }
  };

  const handleBack = () => {
    if (currentStep <= 0 || isComplete) return;
    const prevStep = currentStep - 1;
    // Remove last user + AI message pair
    setMessages(prev => prev.length >= 2 ? prev.slice(0, -2) : prev);
    // Clear data for the current step's field
    const fieldName = STEP_FIELDS[prevStep];
    if (fieldName) {
      setCollectedData(prev => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
    setCurrentStep(prevStep);
    setMultiSelectChoices([]);
  };

  const handleSendMessage = useCallback(async (userMessage: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Save the data from current step
    const nextStep = currentStep + 1;
    const fieldName = STEP_FIELDS[currentStep];
    const newData = { ...collectedData };
    if (fieldName) {
      newData[fieldName] = userMessage;
    }
    setCollectedData(newData);

    try {
      // Build conversation history for Grok
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      conversationHistory.push({ role: 'user', content: userMessage });

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: nextStep,
          message: userMessage,
          collectedData: newData,
          conversationHistory,
        }),
      });

      const data = await response.json();
      const aiResponse = data.data?.response || 'Sorry, something went wrong. Could you try again?';

      const aiMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setCurrentStep(nextStep);

      // Check if onboarding is complete
      if (nextStep >= TOTAL_STEPS - 1) {
        setIsComplete(true);
        // Create student profile
        await createProfile(newData);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: "Something went wrong on my end. Could you try saying that again?",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, collectedData, messages]);

  const createProfile = async (data: Record<string, string>) => {
    try {
      const authData = user ? {
        name: user.name,
        department: user.department,
        yearLevel: user.yearLevel,
        email: user.email,
        admissionNumber: user.admissionNumber,
        matchKey: user.matchKey,
        programType: user.programType,
        batchYear: user.batchYear,
        deptCode: user.deptCode,
        rollNo: user.rollNo,
        deptKnown: user.deptKnown,
        profileAutoFilled: user.profileAutoFilled,
      } : undefined;
      const parsed = parseOnboardingData(data, authData);

      // Use the auth user ID so the profile is linked to the account.
      // PUT will update if the auto-created profile exists, or create if not.
      const profileId = user?.id || localStorage.getItem('mitrrai_student_id') || '';
      const response = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profileId, ...parsed }),
      });

      const result = await response.json();
      if (result.success && result.data?.id) {
        // Store the student ID for later use
        localStorage.setItem('mitrrai_student_id', result.data.id);
        localStorage.setItem('mitrrai_student_name', result.data.name || user?.name || '');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
    }
  };

  const progressPercentage = Math.min(100, Math.round((currentStep / (TOTAL_STEPS - 1)) * 100));

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {currentStep > 0 && !isComplete && (
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all disabled:opacity-40"
              >
                ← Back
              </button>
            )}
            <span className="text-sm text-[var(--muted)]">Setting up your profile</span>
          </div>
          <span className="text-sm font-medium gradient-text">{progressPercentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder={isComplete ? '' : (hasOptions ? 'Or type your answer...' : 'Type your answer...')}
          title="MitrRAI Onboarding"
          subtitle="Let's set up your study profile"
          quickActions={
            hasOptions && !isComplete && !isLoading ? (
              <div>
                <div className="flex flex-wrap gap-2">
                  {currentStepConfig.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleOptionSelect(option)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isMultiSelect && multiSelectChoices.includes(option)
                          ? 'bg-[var(--primary)] text-white border border-[var(--primary)]'
                          : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary-light)]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {isMultiSelect && multiSelectChoices.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-[var(--muted)]">
                      Selected: {multiSelectChoices.join(', ')}
                    </span>
                    <button
                      onClick={handleMultiSelectConfirm}
                      className="btn-primary text-xs px-4 py-1.5"
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Complete Banner */}
      {isComplete && (
        <div className="p-4 border-t border-[var(--border)] fade-in">
          <div className="card p-3 text-center">
            <p className="text-[var(--success)] text-xs font-semibold mb-2">Profile created successfully</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push('/home')}
                className="btn-primary text-xs"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/matches')}
                className="btn-secondary text-xs"
              >
                Find Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
