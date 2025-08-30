import React from 'react';
import { render, screen, waitFor } from '../../../__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LearningPath from '../LearningPath';
import { learningPathService } from '../../lib/services';
import type { LearningPathResponse } from '../../types/api';

// Mock the learning path service
jest.mock('../../lib/services', () => ({
  learningPathService: {
    generatePath: jest.fn(),
  },
}));

const mockLearningPathService = learningPathService as jest.Mocked<typeof learningPathService>;

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const mockLearningPathResponse: LearningPathResponse = {
  title: 'JavaScript Fundamentals Learning Path',
  duration: '1-month',
  skill_level: 'beginner',
  phases: [
    {
      phase_number: 1,
      title: 'JavaScript Basics',
      description: 'Learn the fundamental concepts of JavaScript programming.',
      duration: '1 week',
      objectives: [
        'Understand variables and data types',
        'Learn control structures and loops',
        'Master functions and scope'
      ],
      activities: [
        'Complete JavaScript basics tutorial',
        'Build a simple calculator',
        'Practice with coding exercises'
      ]
    },
    {
      phase_number: 2,
      title: 'DOM Manipulation',
      description: 'Learn how to interact with web pages using JavaScript.',
      duration: '1 week',
      objectives: [
        'Understand the Document Object Model',
        'Learn event handling',
        'Master element selection and modification'
      ],
      activities: [
        'Build an interactive web page',
        'Create a to-do list application',
        'Practice DOM manipulation exercises'
      ]
    }
  ],
  resources: [
    {
      title: 'MDN JavaScript Guide',
      type: 'Documentation',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
      description: 'Comprehensive JavaScript documentation'
    },
    {
      title: 'JavaScript: The Good Parts',
      type: 'Book',
      description: 'Essential JavaScript concepts and best practices'
    }
  ]
};

describe('LearningPath Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockClear();
  });

  it('renders all form elements correctly', () => {
    render(<LearningPath />);
    
    // Check for main form elements
    expect(screen.getByLabelText(/learning goals/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current skill level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred timeline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate learning path/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('shows character count for goals input', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Test goals');
    
    expect(screen.getByText('10/1,000 characters')).toBeInTheDocument();
  });

  it('validates required goals input', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    // Submit button should be disabled when no goals are provided
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    expect(submitButton).toBeDisabled();
    
    // Add some text but less than minimum
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Short');
    
    // Now button should be enabled but validation should fail
    expect(submitButton).not.toBeDisabled();
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please provide more detailed learning goals (at least 10 characters)')).toBeInTheDocument();
    });
  });

  it('validates minimum goals length', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Short');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Please provide more detailed learning goals (at least 10 characters)')).toBeInTheDocument();
  });

  it('disables submit button when goals are empty', () => {
    render(<LearningPath />);
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when valid goals are entered', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('allows selection of skill levels', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    const skillSelect = screen.getByLabelText(/current skill level/i);
    
    // Check all options are available
    expect(screen.getByRole('option', { name: 'Beginner' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Intermediate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Advanced' })).toBeInTheDocument();
    
    // Test selection
    await user.selectOptions(skillSelect, 'intermediate');
    expect(skillSelect).toHaveValue('intermediate');
  });

  it('allows selection of duration options', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    const durationSelect = screen.getByLabelText(/preferred timeline/i);
    
    // Check all options are available
    expect(screen.getByRole('option', { name: '1 Week' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '1 Month' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3 Months' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '6 Months' })).toBeInTheDocument();
    
    // Test selection
    await user.selectOptions(durationSelect, '3-months');
    expect(durationSelect).toHaveValue('3-months');
  });

  it('shows loading state during API call', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    mockLearningPathService.generatePath.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<LearningPath />);
    
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/generating path.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('successfully submits form and displays learning path', async () => {
    const user = userEvent.setup();
    
    mockLearningPathService.generatePath.mockResolvedValue(mockLearningPathResponse);
    
    render(<LearningPath />);
    
    // Fill form
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const skillSelect = screen.getByLabelText(/current skill level/i);
    await user.selectOptions(skillSelect, 'beginner');
    
    const durationSelect = screen.getByLabelText(/preferred timeline/i);
    await user.selectOptions(durationSelect, '1-month');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('JavaScript Fundamentals Learning Path')).toBeInTheDocument();
    });
    
    // Check learning path details
    expect(screen.getByText('Duration: 1-month')).toBeInTheDocument();
    expect(screen.getByText('Level: beginner')).toBeInTheDocument();
    expect(screen.getByText('2 Phases')).toBeInTheDocument();
    
    // Check phases are displayed
    expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    expect(screen.getByText('DOM Manipulation')).toBeInTheDocument();
    
    // Verify API was called
    expect(mockLearningPathService.generatePath).toHaveBeenCalledTimes(1);
    expect(mockLearningPathService.generatePath).toHaveBeenCalledWith(
      expect.objectContaining({
        skill_level: 'beginner',
        duration: '1-month',
      })
    );
  });

  it('displays resources when available', async () => {
    const user = userEvent.setup();
    
    mockLearningPathService.generatePath.mockResolvedValue(mockLearningPathResponse);
    
    render(<LearningPath />);
    
    // Generate learning path
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript Fundamentals Learning Path')).toBeInTheDocument();
    });
    
    // Check resources section
    expect(screen.getByText('Recommended Resources')).toBeInTheDocument();
    expect(screen.getByText('MDN JavaScript Guide')).toBeInTheDocument();
    expect(screen.getByText('JavaScript: The Good Parts')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
  });

  it('displays API error messages', async () => {
    const user = userEvent.setup();
    
    const errorMessage = 'Invalid learning goals provided';
    mockLearningPathService.generatePath.mockRejectedValue({
      response: {
        data: {
          detail: errorMessage,
        },
      },
    });
    
    render(<LearningPath />);
    
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('resets form when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    // Fill form with data
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming');
    
    const skillSelect = screen.getByLabelText(/current skill level/i);
    await user.selectOptions(skillSelect, 'advanced');
    
    const durationSelect = screen.getByLabelText(/preferred timeline/i);
    await user.selectOptions(durationSelect, '6-months');
    
    // Click reset
    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);
    
    // Check form is reset
    expect(goalsTextArea).toHaveValue('');
    expect(skillSelect).toHaveValue('beginner');
    expect(durationSelect).toHaveValue('1-month');
  });

  it('displays overall progress correctly', async () => {
    const user = userEvent.setup();
    
    mockLearningPathService.generatePath.mockResolvedValue(mockLearningPathResponse);
    
    render(<LearningPath />);
    
    // Generate learning path
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript Fundamentals Learning Path')).toBeInTheDocument();
    });
    
    // Initially, progress should be 0%
    expect(screen.getByText('0% Complete')).toBeInTheDocument();
  });

  it('expands and collapses phases when clicked', async () => {
    const user = userEvent.setup();
    
    mockLearningPathService.generatePath.mockResolvedValue(mockLearningPathResponse);
    
    render(<LearningPath />);
    
    // Generate learning path
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript Fundamentals Learning Path')).toBeInTheDocument();
    });
    
    // First phase should be expanded by default
    expect(screen.getByText('Learn the fundamental concepts of JavaScript programming.')).toBeInTheDocument();
    
    // Click to collapse first phase
    const firstPhaseHeader = screen.getByText('JavaScript Basics');
    await user.click(firstPhaseHeader);
    
    expect(screen.queryByText('Learn the fundamental concepts of JavaScript programming.')).not.toBeInTheDocument();
    
    // Click to expand second phase
    const secondPhaseHeader = screen.getByText('DOM Manipulation');
    await user.click(secondPhaseHeader);
    
    expect(screen.getByText('Learn how to interact with web pages using JavaScript.')).toBeInTheDocument();
  });

  it('allows adding focus areas', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    // Add a common focus area
    const theoryButton = screen.getByRole('button', { name: 'Theory & Concepts' });
    await user.click(theoryButton);
    
    // Check if focus area was added (it should appear in the selected areas as a span)
    const selectedFocusAreas = screen.getAllByText('Theory & Concepts');
    expect(selectedFocusAreas).toHaveLength(2); // One in selected area, one in button (disabled)
    expect(theoryButton).toBeDisabled();
  });

  it('allows removing focus areas', async () => {
    const user = userEvent.setup();
    render(<LearningPath />);
    
    // Add a focus area first
    const theoryButton = screen.getByRole('button', { name: 'Theory & Concepts' });
    await user.click(theoryButton);
    
    // Find and click the remove button
    const removeButton = screen.getByRole('button', { name: '×' });
    await user.click(removeButton);
    
    // Check that the button is enabled again
    expect(theoryButton).not.toBeDisabled();
  });

  it('handles form submission with default values', async () => {
    const user = userEvent.setup();
    
    mockLearningPathService.generatePath.mockResolvedValue(mockLearningPathResponse);
    
    render(<LearningPath />);
    
    const goalsTextArea = screen.getByLabelText(/learning goals/i);
    await user.type(goalsTextArea, 'Learn JavaScript programming fundamentals');
    
    const submitButton = screen.getByRole('button', { name: /generate learning path/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLearningPathService.generatePath).toHaveBeenCalledWith(
        expect.objectContaining({
          skill_level: 'beginner', // default value
          duration: '1-month', // default value
        })
      );
    });
  });
});