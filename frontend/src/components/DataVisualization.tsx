import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Paper
} from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';

interface GradeDistribution {
  [key: string]: number;
  A: number;
  B: number;
  C: number;
  D: number;
  F: number;
  W: number;
  Other: number;
}

interface Course {
  course_name: string;
  grade_distribution: GradeDistribution;
  detailed_grade_distribution: Record<string, number>;
  sections: Section[];
  average_gpa: number;
  // ...any other properties...
}

interface Section {
  section_name: string;
  grade_distribution: GradeDistribution;
  detailed_grade_distribution: Record<string, number>;
  average_gpa: number;
  student_count: number;
}

interface RunCalculationDetails {
  run_name: string;
  courses: Course[];
  summary?: {
    total_students: number;
    grade_distribution: GradeDistribution;
    detailed_grade_distribution: Record<string, number>;
    overall_gpa: number;
  };
  class_types?: Record<string, any>;
  // ...any other properties...
}

interface DataVisualizationProps {
  data: RunCalculationDetails;
}

const COLORS = [
  '#4caf50', // A - Green
  '#8bc34a', // B - Light Green
  '#ffeb3b', // C - Yellow
  '#ff9800', // D - Orange
  '#f44336', // F - Red
  '#9e9e9e', // W - Gray
  '#607d8b', // Other - Blue Gray
];

/**
 * A component that visualizes grade distribution data for courses and sections.
 * 
 * @component
 * @param {Object} props - The component props
 * @param {Object} props.data - The grade data to visualize
 * @param {string} props.data.run_name - The name of the data run being displayed
 * @param {Object} [props.data.summary] - Overall summary of grade distribution
 * @param {Object} props.data.summary.grade_distribution - Basic grade distribution for all courses
 * @param {Object} props.data.summary.detailed_grade_distribution - Detailed grade distribution for all courses
 * @param {Array<Object>} props.data.courses - Array of course objects
 * @param {string} props.data.courses[].course_name - The name of the course
 * @param {Object} props.data.courses[].grade_distribution - Basic grade distribution for the course
 * @param {Object} props.data.courses[].detailed_grade_distribution - Detailed grade distribution for the course
 * @param {Array<Object>} props.data.courses[].sections - Array of section objects for the course
 * @param {string} props.data.courses[].sections[].section_name - The name of the section
 * @param {number} props.data.courses[].sections[].student_count - Number of students in the section
 * @param {number} props.data.courses[].sections[].average_gpa - Average GPA for the section
 * @param {Object} props.data.courses[].sections[].grade_distribution - Basic grade distribution for the section
 * @param {Object} props.data.courses[].sections[].detailed_grade_distribution - Detailed grade distribution for the section
 * 
 * @returns {JSX.Element} A component that shows:
 *   - A dropdown to select courses (including "Overall Summary")
 *   - Toggle buttons to switch between basic/detailed grade distributions
 *   - Toggle buttons to switch between bar chart and pie chart views
 *   - Charts visualizing the selected grade distribution data
 *   - Section comparisons when a specific course is selected
 */
export function DataVisualization({ data }: DataVisualizationProps) {
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedChartType, setSelectedChartType] = useState('basic');
  const [chartView, setChartView] = useState<'bar' | 'pie'>('bar');

  // Helper function to convert grade distribution to chart data
  const getGradeDistributionData = (distribution: Record<string, number>) => {
    return Object.entries(distribution).map(([grade, count]) => ({
      grade,
      count
    }));
  };

  // Get all courses + overall summary option
  const courseOptions = [
    { value: 'all', label: 'Overall Summary' },
    ...data.courses.map(course => ({
      value: course.course_name,
      label: course.course_name
    }))
  ];

  // Handle chart view changes
  // This function is called when the user selects a different chart view (bar/pie)
  const handleChartViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    newView: 'bar' | 'pie' | null,
  ) => {
    if (newView !== null) {
      setChartView(newView);
    }
  };

  // Handle chart type changes
  // This function is called when the user selects a different chart type (basic/detailed)
  // It updates the selected chart type in the state
  const handleChartTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: string | null,
  ) => {
    if (newType !== null) {
      setSelectedChartType(newType);
    }
  };

  // Get the appropriate data based on selection
  const getChartData = () => {
    if (selectedCourse === 'all') {
      return data.summary 
        ? getGradeDistributionData(
            selectedChartType === 'basic' 
              ? data.summary.grade_distribution 
              : data.summary.detailed_grade_distribution
          )
        : [];
    } else {
      const course = data.courses.find(c => c.course_name === selectedCourse);
      return course
        ? getGradeDistributionData(
            selectedChartType === 'basic' 
              ? course.grade_distribution 
              : course.detailed_grade_distribution
          )
        : [];
    }
  };

  // Get chart title
  const getChartTitle = () => {
    const typeLabel = selectedChartType === 'basic' ? 'Basic' : 'Detailed';
    const courseLabel = selectedCourse === 'all' ? 'Overall' : selectedCourse;
    return `${typeLabel} Grade Distribution - ${courseLabel}`;
  };

  const chartData = getChartData();

  return (
    <Box>
      <Typography variant="h6">{data.run_name} - Grade Visualization | Old View</Typography>
      
      <Box sx={{ display: 'flex', gap: 2, my: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="course-select-label">Course Level</InputLabel>
          <Select
            labelId="course-select-label"
            id="course-select"
            value={selectedCourse}
            label="Course"
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            {courseOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={selectedChartType}
          exclusive
          onChange={handleChartTypeChange}
          aria-label="chart type"
        >
          <ToggleButton value="basic" aria-label="basic">
            Basic
          </ToggleButton>
          <ToggleButton value="detailed" aria-label="detailed">
            Detailed
          </ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={chartView}
          exclusive
          onChange={handleChartViewChange}
          aria-label="chart view"
        >
          <ToggleButton value="bar" aria-label="bar chart">
            <BarChartIcon />
          </ToggleButton>
          <ToggleButton value="pie" aria-label="pie chart">
            <PieChartIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          {getChartTitle()}
        </Typography>
        
        {chartView === 'bar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grade" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8">
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={150}
                fill="#8884d8"
                dataKey="count"
                nameKey="grade"
                label={({ grade, count, percent }) => `${grade}: ${count} (${(percent * 100).toFixed(1)}%)`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, _name, props) => [`${value} students`, props.payload.grade]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {selectedCourse !== 'all' && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Section Comparison
          </Typography>
          {data.courses
            .find(course => course.course_name === selectedCourse)
            ?.sections.map(section => (
              <Box key={section.section_name} mb={4}>
                <Typography variant="subtitle1">
                  {section.section_name} (Students: {section.student_count}, GPA: {section.average_gpa.toFixed(2)})
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={getGradeDistributionData(
                      selectedChartType === 'basic' 
                        ? section.grade_distribution 
                        : section.detailed_grade_distribution
                    )}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grade" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8">
                      {getGradeDistributionData(
                        selectedChartType === 'basic' 
                          ? section.grade_distribution 
                          : section.detailed_grade_distribution
                      ).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ))}
        </Box>
      )}
    </Box>
  );
}