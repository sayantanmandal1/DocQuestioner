'use client';

import { useState } from 'react';
import { learningPathService } from '@/lib/services';
import type { LearningPathRequest, LearningPathResponse, LearningPhase } from '@/types/api';
import { useNotifications } from './NotificationProvider';

interface FormData {
  goals: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  duration: '1-week' | '1-month' | '3-months' | '6-months';
  focusAreas: string[];
}

interface FormErrors {
  goals?: string;
  skillLevel?: string;
  duration?: string;
}

interface PhaseProgress {
  [key: number]: {
    completed: boolean;
    completedObjectives: boolean[];
    completedActivities: boolean[];
  };
}

export default function LearningPath() {
  const [formData, setFormData] = useState<FormData>({
    goals: '',
    skillLevel: 'beginner',
    duration: '1-month',
    focusAreas: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LearningPathResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const { success, error } = useNotifications();
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgress>({});
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [customFocusArea, setCustomFocusArea] = useState('');

  const commonFocusAreas = [
    'Theory & Concepts',
    'Practical Projects',
    'Industry Best Practices',
    'Tools & Technologies',
    'Problem Solving',
    'Communication Skills',
    'Leadership',
    'Certification Prep'
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.goals.trim()) {
      newErrors.goals = 'Learning goals are required';
    } else if (formData.goals.length < 10) {
      newErrors.goals = 'Please provide more detailed learning goals (at least 10 characters)';
    } else if (formData.goals.length > 1000) {
      newErrors.goals = 'Learning goals must be less than 1,000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);
    setResult(null);
    setPhaseProgress({});

    try {
      const request: LearningPathRequest = {
        goals: formData.goals,
        skill_level: formData.skillLevel,
        duration: formData.duration,
        focus_areas: formData.focusAreas.length > 0 ? formData.focusAreas : undefined,
      };

      const response = await learningPathService.generatePath(request);
      setResult(response);
      
      // Initialize progress tracking for all phases
      const initialProgress: PhaseProgress = {};
      response.phases.forEach(phase => {
        initialProgress[phase.phase_number] = {
          completed: false,
          completedObjectives: new Array(phase.objectives.length).fill(false),
          completedActivities: new Array(phase.activities.length).fill(false),
        };
      });
      setPhaseProgress(initialProgress);
      
      // Expand first phase by default
      setExpandedPhases(new Set([1]));
      
      success('Learning path generated successfully!');
    } catch (err: unknown) {
      console.error('Learning path generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setApiError(errorMessage);
      error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addFocusArea = (area: string) => {
    if (area && !formData.focusAreas.includes(area)) {
      handleInputChange('focusAreas', [...formData.focusAreas, area]);
    }
  };

  const removeFocusArea = (area: string) => {
    handleInputChange('focusAreas', formData.focusAreas.filter(a => a !== area));
  };

  const addCustomFocusArea = () => {
    if (customFocusArea.trim()) {
      addFocusArea(customFocusArea.trim());
      setCustomFocusArea('');
    }
  };

  const togglePhaseExpansion = (phaseNumber: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseNumber)) {
      newExpanded.delete(phaseNumber);
    } else {
      newExpanded.add(phaseNumber);
    }
    setExpandedPhases(newExpanded);
  };

  const toggleObjectiveCompletion = (phaseNumber: number, objectiveIndex: number) => {
    setPhaseProgress(prev => {
      const updated = { ...prev };
      if (!updated[phaseNumber]) {
        updated[phaseNumber] = {
          completed: false,
          completedObjectives: new Array(result?.phases.find(p => p.phase_number === phaseNumber)?.objectives.length || 0).fill(false),
          completedActivities: new Array(result?.phases.find(p => p.phase_number === phaseNumber)?.activities.length || 0).fill(false),
        };
      }
      updated[phaseNumber].completedObjectives[objectiveIndex] = !updated[phaseNumber].completedObjectives[objectiveIndex];
      
      // Check if phase is completed
      const phase = result?.phases.find(p => p.phase_number === phaseNumber);
      if (phase) {
        const allObjectivesCompleted = updated[phaseNumber].completedObjectives.every(Boolean);
        const allActivitiesCompleted = updated[phaseNumber].completedActivities.every(Boolean);
        updated[phaseNumber].completed = allObjectivesCompleted && allActivitiesCompleted;
      }
      
      return updated;
    });
  };

  const toggleActivityCompletion = (phaseNumber: number, activityIndex: number) => {
    setPhaseProgress(prev => {
      const updated = { ...prev };
      if (!updated[phaseNumber]) {
        updated[phaseNumber] = {
          completed: false,
          completedObjectives: new Array(result?.phases.find(p => p.phase_number === phaseNumber)?.objectives.length || 0).fill(false),
          completedActivities: new Array(result?.phases.find(p => p.phase_number === phaseNumber)?.activities.length || 0).fill(false),
        };
      }
      updated[phaseNumber].completedActivities[activityIndex] = !updated[phaseNumber].completedActivities[activityIndex];
      
      // Check if phase is completed
      const phase = result?.phases.find(p => p.phase_number === phaseNumber);
      if (phase) {
        const allObjectivesCompleted = updated[phaseNumber].completedObjectives.every(Boolean);
        const allActivitiesCompleted = updated[phaseNumber].completedActivities.every(Boolean);
        updated[phaseNumber].completed = allObjectivesCompleted && allActivitiesCompleted;
      }
      
      return updated;
    });
  };

  const getOverallProgress = (): number => {
    if (!result || Object.keys(phaseProgress).length === 0) return 0;
    
    const completedPhases = Object.values(phaseProgress).filter(p => p.completed).length;
    return (completedPhases / result.phases.length) * 100;
  };

  const resetForm = () => {
    setFormData({
      goals: '',
      skillLevel: 'beginner',
      duration: '1-month',
      focusAreas: [],
    });
    setErrors({});
    setResult(null);
    setApiError(null);
    setPhaseProgress({});
    setExpandedPhases(new Set());
    setCustomFocusArea('');
  };

  const copyPathToClipboard = async () => {
    if (!result) return;
    
    let pathText = `Learning Path: ${result.title}\n`;
    pathText += `Duration: ${result.duration}\n`;
    pathText += `Skill Level: ${result.skill_level}\n\n`;
    
    result.phases.forEach(phase => {
      pathText += `Phase ${phase.phase_number}: ${phase.title}\n`;
      pathText += `Duration: ${phase.duration}\n`;
      pathText += `Description: ${phase.description}\n\n`;
      pathText += `Objectives:\n`;
      phase.objectives.forEach(obj => pathText += `- ${obj}\n`);
      pathText += `\nActivities:\n`;
      phase.activities.forEach(act => pathText += `- ${act}\n`);
      pathText += '\n---\n\n';
    });
    
    if (result.resources.length > 0) {
      pathText += 'Resources:\n';
      result.resources.forEach(resource => {
        pathText += `- ${resource.title} (${resource.type})`;
        if (resource.url) pathText += `: ${resource.url}`;
        if (resource.description) pathText += ` - ${resource.description}`;
        pathText += '\n';
      });
    }

    try {
      await navigator.clipboard.writeText(pathText);
      success('Learning path copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Learning Goals */}
          <div>
            <label htmlFor="goals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Learning Goals
            </label>
            <textarea
              id="goals"
              value={formData.goals}
              onChange={(e) => handleInputChange('goals', e.target.value)}
              placeholder="Describe what you want to learn and achieve. Be specific about your objectives, desired outcomes, and any particular areas of interest..."
              className={`w-full h-32 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.goals ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.goals && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.goals}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formData.goals.length}/1,000 characters
            </p>
          </div>

          {/* Skill Level and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Skill Level
              </label>
              <select
                id="skillLevel"
                value={formData.skillLevel}
                onChange={(e) => handleInputChange('skillLevel', e.target.value as FormData['skillLevel'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Timeline
              </label>
              <select
                id="duration"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value as FormData['duration'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
              >
                <option value="1-week">1 Week</option>
                <option value="1-month">1 Month</option>
                <option value="3-months">3 Months</option>
                <option value="6-months">6 Months</option>
              </select>
            </div>
          </div>

          {/* Focus Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Focus Areas (Optional)
            </label>
            
            {/* Selected Focus Areas */}
            {formData.focusAreas.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {formData.focusAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => removeFocusArea(area)}
                      className="ml-2 text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100"
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Common Focus Areas */}
            <div className="mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Common focus areas:</p>
              <div className="flex flex-wrap gap-2">
                {commonFocusAreas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => addFocusArea(area)}
                    disabled={isLoading || formData.focusAreas.includes(area)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Focus Area */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customFocusArea}
                onChange={(e) => setCustomFocusArea(e.target.value)}
                placeholder="Add custom focus area..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFocusArea())}
              />
              <button
                type="button"
                onClick={addCustomFocusArea}
                disabled={isLoading || !customFocusArea.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !formData.goals.trim()}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Path...
                </span>
              ) : (
                'Generate Learning Path'
              )}
            </button>
            
            <button
              type="button"
              onClick={resetForm}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Error Display */}
        {apiError && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {apiError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="mt-6 space-y-6">
            {/* Header with Progress */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {result.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Duration: {result.duration}</span>
                  <span>•</span>
                  <span>Level: {result.skill_level}</span>
                  <span>•</span>
                  <span>{result.phases.length} Phases</span>
                </div>
              </div>
              <button
                onClick={copyPathToClipboard}
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 text-sm flex items-center gap-1"
                title="Copy learning path to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Path
              </button>
            </div>

            {/* Overall Progress */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Overall Progress</h4>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round(getOverallProgress())}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getOverallProgress()}%` }}
                ></div>
              </div>
            </div>

            {/* Learning Phases */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Learning Phases</h4>
              {result.phases.map((phase) => {
                const isExpanded = expandedPhases.has(phase.phase_number);
                const progress = phaseProgress[phase.phase_number];
                const isCompleted = progress?.completed || false;
                
                return (
                  <div
                    key={phase.phase_number}
                    className={`border rounded-lg ${isCompleted ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600'}`}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => togglePhaseExpansion(phase.phase_number)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCompleted 
                              ? 'bg-green-600 text-white' 
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}>
                            {isCompleted ? '✓' : phase.phase_number}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {phase.title}
                            </h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Duration: {phase.duration}
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="pt-4 space-y-4">
                          {/* Description */}
                          <p className="text-gray-700 dark:text-gray-300">
                            {phase.description}
                          </p>

                          {/* Objectives */}
                          <div>
                            <h6 className="font-medium text-gray-900 dark:text-white mb-2">Objectives</h6>
                            <ul className="space-y-2">
                              {phase.objectives.map((objective, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <button
                                    onClick={() => toggleObjectiveCompletion(phase.phase_number, index)}
                                    className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      progress?.completedObjectives[index]
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                  >
                                    {progress?.completedObjectives[index] && (
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                  <span className={`text-sm ${
                                    progress?.completedObjectives[index] 
                                      ? 'line-through text-gray-500 dark:text-gray-400' 
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {objective}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Activities */}
                          <div>
                            <h6 className="font-medium text-gray-900 dark:text-white mb-2">Activities</h6>
                            <ul className="space-y-2">
                              {phase.activities.map((activity, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <button
                                    onClick={() => toggleActivityCompletion(phase.phase_number, index)}
                                    className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      progress?.completedActivities[index]
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                  >
                                    {progress?.completedActivities[index] && (
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                  <span className={`text-sm ${
                                    progress?.completedActivities[index] 
                                      ? 'line-through text-gray-500 dark:text-gray-400' 
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {activity}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Resources */}
            {result.resources && result.resources.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommended Resources</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.resources.map((resource, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {resource.title}
                          </h5>
                          <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                            {resource.type}
                          </p>
                          {resource.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {resource.description}
                            </p>
                          )}
                          {resource.url && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                            >
                              Visit Resource
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  );
}