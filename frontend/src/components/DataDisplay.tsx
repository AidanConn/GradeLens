import { useState, FC, ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Card,
  CardContent,
  Grid,
  TablePagination,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material'; // Import Material-UI components for styling and layout
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Icon for expanding/collapsing accordions
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Icon for info tooltips
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'; // Import Recharts components for data visualization

// Define the props for the DataDisplay component
interface DataDisplayProps {
  data: any;
  displayType: 'summary' | 'courses' | 'sections' | 'students';
  searchTerm?: string;
}

// Helper function to get color for grade
const getGradeColor = (grade: string) => {
  const gradeColors: Record<string, string> = {
    'A': '#4caf50',
    'B': '#8bc34a',
    'C': '#ffeb3b',
    'D': '#ff9800',
    'F': '#f44336',
    'W': '#9e9e9e',
    'I': '#9c27b0',    // Purple for Incomplete
    'NP': '#3f51b5',   // Indigo for No Pass
    'Other': '#607d8b',
  };

  // Check for special cases first
  if (grade.startsWith('A')) return gradeColors['A'];
  if (grade.startsWith('B')) return gradeColors['B'];
  if (grade.startsWith('C')) return gradeColors['C'];
  if (grade.startsWith('D')) return gradeColors['D'];
  if (grade === 'F') return gradeColors['F'];
  if (grade === 'W') return gradeColors['W'];
  if (grade === 'I') return gradeColors['I'];
  if (grade === 'NP') return gradeColors['NP'];
  return gradeColors[grade] || '#bdbdbd'; // Default to a neutral gray color if grade is invalid
};

// Function to create data for pie charts
const createPieData = (distribution: any) => {
  return Object.entries(distribution).map(([name, value]) => ({
    name,
    value: value as number,
    color: getGradeColor(name),
  }));
};

/**
 * A versatile data visualization component for educational data that provides multiple display modes.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.data - The data object containing students, courses, sections, and summary information
 * @param {Object} [props.data.students] - Student records indexed by student ID
 * @param {Object[]} [props.data.courses] - Array of course objects with details and statistics
 * @param {Object} [props.data.summary] - Summary statistics about all students and courses
 * @param {Object} [props.data.class_types] - Information about different course types
 * @param {Object} [props.data.improvement_lists] - Lists of students requiring attention
 * @param {'summary' | 'courses' | 'sections' | 'students'} props.displayType - Controls which view to display
 * @param {string} [props.searchTerm=''] - Optional search term to filter student data
 * 
 * @returns {JSX.Element} The appropriate view based on displayType:
 *   - summary: Overall statistics, grade distributions, and students needing attention
 *   - courses: Detailed course information with grade distributions
 *   - sections: Section-level statistics and grade distributions
 *   - students: Filterable and sortable student table with pagination
 * 
 * @example
 * <DataDisplay 
 *   data={academicData} 
 *   displayType="summary" 
 *   searchTerm="smith"
 * />
 */
export const DataDisplay: FC<DataDisplayProps> = ({
  data,
  displayType,
  searchTerm = '',
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedGroup, _setSelectedGroup] = useState<string>('all');  // renamed setter to suppress TS6133
  const [chartDetail, setChartDetail] = useState<'basic' | 'detailed'>('basic');
  const [workPage, setWorkPage] = useState(0);
  const [workRowsPerPage, setWorkRowsPerPage] = useState(10);
  const [goodPage, setGoodPage] = useState(0);
  const [goodRowsPerPage, setGoodRowsPerPage] = useState(10);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const createSortHandler = (property: string) => () => {
    handleRequestSort(property);
  };

  const handleWorkPageChange = (_: unknown, newPage: number) => setWorkPage(newPage);
  const handleWorkRowsPerPageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWorkRowsPerPage(parseInt(e.target.value, 10));
    setWorkPage(0);
  };
  const handleGoodPageChange = (_: unknown, newPage: number) => setGoodPage(newPage);
  const handleGoodRowsPerPageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGoodRowsPerPage(parseInt(e.target.value, 10));
    setGoodPage(0);
  };

  const COLORS = ['#4caf50', '#8bc34a', '#ffeb3b', '#ff9800', '#f44336', '#9e9e9e', '#607d8b'];

  // Get courses from either course_list (new format) or courses (old format)
  const coursesList = data.course_list || Object.values(data.courses || {}) || [];

  // Generate course options from data
  const courseOptions = coursesList.length > 0
    ? ['all', ...coursesList.map((course: any) => course.course_name)]
    : ['all'];

  // Generate group options if groups are available
  const groupOptions = data.groups && data.groups.length > 0
    ? ['all', ...data.groups.map((group: any) => group.group_name)]
    : ['all'];

  // Generate section options
  const sectionOptions = coursesList.length > 0
    ? ['all', ...coursesList.flatMap((course: any) =>
      course.sections.map((section: any) => section.section_name)
    )]
    : ['all'];

  // Filter students based on search term and selected filters
  const filteredStudents = data.students
    ? Object.values(data.students).filter((student: any) => {
      const matchesSearch = searchTerm === '' ||
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.courses.some((c: any) => c.grade.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCourse = selectedCourse === 'all' ||
        student.courses.some((c: any) => c.course === selectedCourse);

      const matchesSection = selectedSection === 'all' ||
        student.courses.some((c: any) => c.section === selectedSection);

      return matchesSearch && matchesCourse && matchesSection;
    })
    : [];

  // Sort students based on selected order and orderBy property
  const sortedStudents = [...filteredStudents].sort((a: any, b: any) => {
    let aValue, bValue;

    if (orderBy === 'name') {
      aValue = a.name;
      bValue = b.name;
    } else if (orderBy === 'id') {
      aValue = a.id;
      bValue = b.id;
    } else if (orderBy === 'gpa') {
      aValue = a.gpa;
      bValue = b.gpa;
    } else {
      return 0;
    }

    if (order === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Simple pagination logic
  const paginatedStudents = sortedStudents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Build a map from group to course z-scores
  const courseGroupZMap: Record<string, { course: string, z: number }[]> = {};
  if (data.groups && Array.isArray(data.groups)) {
    data.groups.forEach((group: any) => {
      if (group.courses && group.courses.length && group.z_score !== undefined) {
        courseGroupZMap[group.group_name] = group.courses.map((course: string) => ({
          course,
          z: group.z_score // If you have per-course z-scores within group, use that value here instead
        }));
      }
    });
  }

  const renderSummaryView = () => {
    // Check if summary data is available
    if (!data.summary) return <Alert severity="info">No summary data available</Alert>;

    const { total_students, grade_distribution, detailed_grade_distribution, overall_gpa } = data.summary;
    const pieData = createPieData(grade_distribution);
    const detailedPieData = createPieData(detailed_grade_distribution);

    // compute accurate pass rate from all grade entries
    const totalGradeEntries = Object.values(grade_distribution)
      .reduce((sum: number, v) => sum + (v as number), 0);
    const passEntries =
      (grade_distribution.A || 0) +
      (grade_distribution.B || 0) +
      (grade_distribution.C || 0);

    // Render the summary view with cards and charts
    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Total Students</Typography>
                <Typography variant="h3" sx={{ textAlign: 'center' }}>{total_students}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Overall GPA</Typography>
                <Typography variant="h3" sx={{ textAlign: 'center' }}>
                  {overall_gpa.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Pass Rate</Typography>
                <Typography variant="h3" sx={{ textAlign: 'center' }}>
                  {totalGradeEntries > 0
                    ? ((passEntries / totalGradeEntries * 100).toFixed(1))
                    : '0.0'
                  }%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Group Z-Scores */}
        {data.groups && data.groups.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>Group Z-Scores</Typography>
            <Grid container spacing={2}>
              {data.groups.map((group: any) => (
                <Grid item xs={12} md={6} key={group.group_name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {group.group_name}
                      </Typography>
                      <Typography variant="body2">
                        Z-Score: <Chip
                          label={group.z_score !== undefined ? group.z_score.toFixed(2) : 'N/A'}
                          sx={getChipStyles(group.z_score)}
                          size="small"
                          icon={
                            <Tooltip title="Group Z-score: Compares this group's GPA to all groups.">
                              <InfoOutlinedIcon fontSize="small" />
                            </Tooltip>
                          }
                        />
                      </Typography>
                      <Typography variant="body2">
                        Average GPA: {group.average_gpa !== undefined ? group.average_gpa.toFixed(2) : 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                        <strong>Courses in this group:</strong>
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Course</TableCell>
                              <TableCell>Avg GPA</TableCell>
                              <TableCell>Z-score (in group)</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(group.courses || []).map((courseCode: string) => (
                              <TableRow key={courseCode}>
                                <TableCell>{courseCode}</TableCell>
                                <TableCell>
                                  {data.courses?.[courseCode]?.average_gpa !== undefined
                                    ? data.courses[courseCode].average_gpa.toFixed(2)
                                    : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={
                                      group.course_z_scores && group.course_z_scores[courseCode] !== undefined
                                        ? group.course_z_scores[courseCode].toFixed(2)
                                        : 'N/A'
                                    }
                                    sx={getChipStyles(group.course_z_scores && group.course_z_scores[courseCode])}
                                    size="small"
                                    icon={
                                      <Tooltip title="Course Z-score within this group">
                                        <InfoOutlinedIcon fontSize="small" />
                                      </Tooltip>
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Grade Distribution Charts */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Grade Distribution</Typography>
            <Typography variant="caption" color="textSecondary">
              (Counts all grades, not unique students)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => [value, 'Students']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Grid>
          {/* Detailed Grade Distribution */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Detailed Grade Distribution</Typography>
            <Typography variant="caption" color="textSecondary">
              (Counts all grades, not unique students)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={detailedPieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip formatter={(value) => [value, 'Students']} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {detailedPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Grid>
        </Grid>

        {/* Group Z-Scores */}
        {data.groups && data.groups.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>Group Z-Scores</Typography>
            <Grid container spacing={2}>
              {data.groups.map((group: any) => (
                <Grid item xs={12} md={6} key={group.group_name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="subtitle1" fontWeight="bold">{group.group_name}</Typography>
                        <Chip
                          label={`Z-score: ${group.z_score !== undefined ? group.z_score.toFixed(2) : 'N/A'}`}
                          sx={{
                            bgcolor:
                              group.z_score > 0.5
                                ? '#4caf50'
                                : group.z_score < -0.5
                                  ? '#f44336'
                                  : '#bdbdbd',
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                          size="small"
                        />
                      </Box>
                      {/* Table of courses in this group */}
                      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Course</TableCell>
                              <TableCell>Average GPA</TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  Z-Score (in Group)
                                  <Tooltip title="Compares each course's average GPA to other courses in the same group. Positive = above group average, negative = below.">
                                    <InfoOutlinedIcon fontSize="small" sx={{ color: '#1976d2', cursor: 'pointer' }} />
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(group.courses || []).map((courseCode: string) => {
                              const course = (data.courses && data.courses[courseCode]) ||
                                (data.course_list && data.course_list.find((c: any) => c.course_name === courseCode));
                              const z = group.course_z_scores?.[courseCode];
                              return (
                                <TableRow key={courseCode}>
                                  <TableCell>{courseCode}</TableCell>
                                  <TableCell>
                                    {course && course.average_gpa !== undefined
                                      ? course.average_gpa.toFixed(2)
                                      : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {z !== undefined ? (
                                      <Tooltip
                                        title={
                                          z > 0.5
                                            ? 'Above Group Average'
                                            : z < -0.5
                                              ? 'Below Group Average'
                                              : 'Near Group Average'
                                        }
                                      >
                                        <Chip
                                          label={z.toFixed(2)}
                                          icon={<InfoOutlinedIcon fontSize="small" />}
                                          sx={{
                                            bgcolor:
                                              z > 0.5
                                                ? '#4caf50'
                                                : z < -0.5
                                                  ? '#f44336'
                                                  : '#bdbdbd',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: 16,
                                            minWidth: 60,
                                          }}
                                          size="medium"
                                        />
                                      </Tooltip>
                                    ) : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Need Attention Students */}
        {data.improvement_lists && data.improvement_lists.work_list && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>Students on Work List</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>GPA</TableCell>
                    <TableCell>Courses</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.improvement_lists.work_list
                    .slice(workPage * workRowsPerPage, workPage * workRowsPerPage + workRowsPerPage)
                    .map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.id}</TableCell>
                        <TableCell>{student.gpa.toFixed(2)}</TableCell>
                        <TableCell>
                          {student.courses.map((course: any) => {
                            // Determine if this is a special grade that doesn't affect GPA
                            const isSpecialGrade = ['W', 'I', 'NP'].includes(course.grade);

                            return (
                              <Chip
                                key={`${student.id}-${course.course}`}
                                label={`${course.course}: ${course.grade} (${course.credit_hours} cr.)`}
                                size="small"
                                color={isSpecialGrade ? "default" : "error"}
                                sx={{
                                  m: 0.3,
                                  fontStyle: isSpecialGrade ? 'italic' : 'normal',
                                  bgcolor: isSpecialGrade ? getGradeColor(course.grade) : undefined,
                                  color: isSpecialGrade ? 'white' : undefined
                                }}
                              />
                            );
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={data.improvement_lists.work_list.length}
                rowsPerPage={workRowsPerPage}
                page={workPage}
                onPageChange={handleWorkPageChange}
                onRowsPerPageChange={handleWorkRowsPerPageChange}
                sx={{
                  borderTop: '1px solid #e0e0e0',
                  borderRadius: 0,
                  boxShadow: 'none',
                  '.MuiTablePagination-toolbar': {
                    bgcolor: 'inherit',
                    borderRadius: 0,
                    fontWeight: 'bold',
                    minHeight: 40,
                    paddingLeft: 2,
                    paddingRight: 2,
                  },
                  '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                    color: 'inherit',
                    fontWeight: 'bold',
                  },
                  '.MuiTablePagination-actions button': {
                    color: '#1976d2',
                    fontWeight: 'bold',
                    fontSize: 18,
                  },
                  '.MuiInputBase-root': {
                    bgcolor: 'inherit',
                    borderRadius: 0,
                    fontWeight: 'bold',
                  },
                }}
              />
            </TableContainer>
          </Box>
        )}

        {/* Good List Students */}
        {data.improvement_lists && data.improvement_lists.good_list && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>Students on Good List</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>GPA</TableCell>
                    <TableCell>Courses</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.improvement_lists.good_list
                    .slice(goodPage * goodRowsPerPage, goodPage * goodRowsPerPage + goodRowsPerPage)
                    .map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.id}</TableCell>
                        <TableCell>{student.gpa.toFixed(2)}</TableCell>
                        <TableCell>
                          {student.courses.map((course: any) => {
                            // Determine if this is a special grade that doesn't affect GPA
                            const isSpecialGrade = ['W', 'I', 'NP'].includes(course.grade);

                            return (
                              <Chip
                                key={`${student.id}-${course.course}`}
                                label={`${course.course}: ${course.grade} (${course.credit_hours} cr.)`}
                                size="small"
                                color={isSpecialGrade ? "default" : "success"}
                                sx={{
                                  m: 0.3,
                                  fontStyle: isSpecialGrade ? 'italic' : 'normal',
                                  bgcolor: isSpecialGrade ? getGradeColor(course.grade) : undefined,
                                  color: isSpecialGrade ? 'white' : undefined
                                }}
                              />
                            );
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={data.improvement_lists.good_list.length}
                rowsPerPage={goodRowsPerPage}
                page={goodPage}
                onPageChange={handleGoodPageChange}
                onRowsPerPageChange={handleGoodRowsPerPageChange}
                sx={{
                  borderTop: '1px solid #e0e0e0',
                  borderRadius: 0,
                  boxShadow: 'none',
                  '.MuiTablePagination-toolbar': {
                    bgcolor: 'inherit',
                    borderRadius: 0,
                    fontWeight: 'bold',
                    minHeight: 40,
                    paddingLeft: 2,
                    paddingRight: 2,
                  },
                  '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                    color: 'inherit',
                    fontWeight: 'bold',
                  },
                  '.MuiTablePagination-actions button': {
                    color: '#1976d2',
                    fontWeight: 'bold',
                    fontSize: 18,
                  },
                  '.MuiInputBase-root': {
                    bgcolor: 'inherit',
                    borderRadius: 0,
                    fontWeight: 'bold',
                  },
                }}
              />
            </TableContainer>
          </Box>
        )}

      </Box>
    );
  };

  const renderCoursesView = () => {
    // derive filteredCourses based on selectedGroup
    const filteredCourses = selectedGroup === 'all'
      ? coursesList
      : coursesList.filter((course: any) => {
        const grp = data.groups.find((g: any) => g.group_name === selectedGroup);
        return grp?.courses.includes(course.course_name);
      });

    return (
      <Box>
        {data.class_types && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>Course Types</Typography>
            <Grid container spacing={2}>
              {Object.entries(data.class_types).map(([type, typeData]: [string, any]) => (
                <Grid item xs={12} md={6} key={type}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">{type}</Typography>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Students: {typeData.total_students}</Typography>
                        <Typography variant="body2">Avg GPA: {typeData.average_gpa.toFixed(2)}</Typography>
                      </Box>
                      <ResponsiveContainer width="100%" minWidth={0} height={160}>
                        <BarChart data={Object.entries(typeData.grade_distribution).map(([key, value]) => ({ grade: key, count: value }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="grade" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="count" fill="#8884d8">
                            {Object.entries(typeData.grade_distribution).map(([key, _], index) => (
                              <Cell key={`cell-${index}`} fill={getGradeColor(key)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Toggle between basic/detailed grades */}
        <Box mb={2}>
          <ToggleButtonGroup
            value={chartDetail}
            exclusive
            size="small"
            onChange={(_e, val) => val && setChartDetail(val)}
          >
            <ToggleButton value="basic">Basic Grades</ToggleButton>
            <ToggleButton value="detailed">Detailed Grades</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Filter by Group dropdown */}
        {data.groups && data.groups.length > 0 && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="group-select-label">Filter by Group</InputLabel>
            <Select
              labelId="group-select-label"
              id="group-select"
              value={selectedGroup}
              label="Filter by Group"
              onChange={(e) => _setSelectedGroup(e.target.value)}  // use renamed setter
            >
              <MenuItem value="all">All Groups</MenuItem>
              {groupOptions.filter(option => option !== 'all').map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box mb={2}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>What does G-score mean?</strong>
            <Tooltip title="G-score compares a course's GPA to other courses at the same level (e.g., all 200-level courses).">
              <InfoOutlinedIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
            </Tooltip>
            <br />
            The G-score shown for each course is a z-score that compares the course's average GPA to other courses at the same level (e.g., all 200-level courses).<br />
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>G-score &gt; 0</strong>: Course GPA is above the average for its level.</li>
              <li><strong>G-score &lt; 0</strong>: Course GPA is below the average for its level.</li>
              <li><strong>G-score ≈ 0</strong>: Course GPA is near the average for its level.</li>
            </ul>
            This helps you quickly see which courses stand out (positively or negatively) compared to their peers.
          </Alert>
        </Box>

        <Typography variant="h6" gutterBottom>Course Details</Typography>
        <Grid container spacing={2}>
          {filteredCourses.map((course: any) => (
            <Grid item xs={12} md={6} key={course.course_name}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {course.course_name} ({course.course_type}) - {course.sections[0]?.credit_hours || 0} Credits
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2">Students: {course.total_students}</Typography>
                      <Typography variant="body2">Avg GPA: {course.average_gpa.toFixed(2)}</Typography>
                      {/* G-score Chip */}
                      {course.g_score !== undefined && (
                        <Chip
                          label={`G-score: ${course.g_score.toFixed(2)}`}
                          sx={{
                            bgcolor:
                              course.g_score > 0.5
                                ? '#4caf50'
                                : course.g_score < -0.5
                                  ? '#f44336'
                                  : '#bdbdbd',
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                          size="small"
                          icon={
                            <Tooltip title="Course G-score: Compares this course's GPA to other courses at the same level.">
                              <InfoOutlinedIcon fontSize="small" />
                            </Tooltip>
                          }
                        />
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        {chartDetail === 'basic' ? 'Grade Distribution' : 'Detailed Grade Distribution'}
                      </Typography>
                      <ResponsiveContainer width="99%" minWidth={0} height={240}>
                        <BarChart
                          data={
                            chartDetail === 'basic'
                              ? Object.entries(course.grade_distribution).map(([key, value]) => ({ grade: key, count: value }))
                              : Object.entries(course.detailed_grade_distribution).map(([key, value]) => ({ grade: key, count: value }))
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="grade" />
                          <YAxis />
                          <RechartsTooltip formatter={(value: any, name: any) => [`${value} students`, `Grade: ${name}`]} />
                          <Bar dataKey="count" fill="#8884d8">
                            {(
                              chartDetail === 'basic'
                                ? Object.entries(course.grade_distribution)
                                : Object.entries(course.detailed_grade_distribution)
                            ).map(([key], index) => (
                              <Cell key={`cell-${index}`} fill={getGradeColor(key)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Grid>
                    {/* Add more Grid items here if you want more details/charts side by side */}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>

      </Box>
    );
  };

  const getChipStyles = (zScore: number | undefined) => {
    if (zScore === undefined) {
      return { bgcolor: '#bdbdbd', color: 'white' };
    }
    if (zScore > 0.5) {
      return { bgcolor: '#4caf50', color: 'white' };
    }
    if (zScore < -0.5) {
      return { bgcolor: '#f44336', color: 'white' };
    }
    return { bgcolor: '#bdbdbd', color: 'white' };
  };

  const renderSectionsView = () => {
    if (!coursesList || coursesList.length === 0) {
      return <Alert severity="info">No section data available</Alert>;
    }

    // Build a map from section name to group z-score (if available)
    const sectionGroupZMap: Record<string, { z: number, group: string }> = {};
    if (data.groups && Array.isArray(data.groups)) {
      data.groups.forEach((group: any) => {
        if (group.section_group_z_scores) {
          Object.entries(group.section_group_z_scores).forEach(([section, z]) => {
            sectionGroupZMap[section] = { z: z as number, group: group.group_name };
          });
        }
      });
    }

    return (
      <Box>
        {/* Toggle between basic/detailed grades for sections */}
        <Box mb={2}>
          <ToggleButtonGroup
            value={chartDetail}
            exclusive
            size="small"
            onChange={(_e, val) => val && setChartDetail(val)}
          >
            <ToggleButton value="basic">Basic Grades</ToggleButton>
            <ToggleButton value="detailed">Detailed Grades</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="course-select-label">Filter by Course</InputLabel>
          <Select
            labelId="course-select-label"
            id="course-select"
            value={selectedCourse}
            label="Filter by Course"
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <MenuItem value="all">All Courses</MenuItem>
            {coursesList.map((course: any) => (
              <MenuItem key={course.course_name} value={course.course_name}>
                {course.course_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {coursesList
          .filter((course: any) => selectedCourse === 'all' || course.course_name === selectedCourse)
          // Deduplicate by section_name and collect group(s)
          .map((course: any) => {
            // Map of section_name -> {section, groups: Set}
            const sectionMap = new Map<string, { section: any, groups: Set<string> }>();
            if (data.groups && Array.isArray(data.groups)) {
              data.groups.forEach((group: any) => {
                if (group.sections) {
                  group.sections.forEach((sectionName: string) => {
                    const found = course.sections.find((s: any) => s.section_name === sectionName);
                    if (found) {
                      if (!sectionMap.has(sectionName)) {
                        sectionMap.set(sectionName, { section: found, groups: new Set() });
                      }
                      sectionMap.get(sectionName)!.groups.add(group.group_name);
                    }
                  });
                }
              });
            }
            // Fallback: if no group info, just dedupe by section_name
            if (sectionMap.size === 0) {
              course.sections.forEach((s: any) => {
                if (!sectionMap.has(s.section_name)) {
                  sectionMap.set(s.section_name, { section: s, groups: new Set() });
                }
              });
            }
            return (
              <Box key={course.course_name} mb={4}>
                <Typography variant="h6" gutterBottom>
                  {course.course_name} Sections - {course.sections[0]?.credit_hours || 0} Credit Hours
                </Typography>
                <Grid container spacing={2}>
                  {Array.from(sectionMap.values()).map(({ section, groups }) => (
                    <Grid item xs={12} md={6} lg={4} key={section.section_name}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {section.section_name}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">
                              Students: {section.student_count}
                            </Typography>
                            <Typography variant="body2">
                              Credits: {section.credit_hours}
                            </Typography>
                            <Typography variant="body2">
                              Avg GPA: {section.average_gpa ? section.average_gpa.toFixed(2) : 'N/A'}
                            </Typography>
                          </Box>
                          {/* Show group(s) */}
                          {groups.size > 0 && (
                            <Box mb={1}>
                              <Typography variant="body2" color="textSecondary">
                                Group(s): {[...groups].join(', ')}
                              </Typography>
                            </Box>
                          )}
                          {/* Z-Score Visual */}
                          <Box display="flex" alignItems="center" mb={1}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              Z-Score:
                            </Typography>
                            <Tooltip title="Section Z-score: Compares this section's GPA to other sections of the same course.">
                              <Chip
                                label={
                                  section.z_score !== undefined
                                    ? (section.z_score !== undefined ? section.z_score.toFixed(2) : 'N/A')
                                    : 'N/A'
                                }
                                color={
                                  section.z_score > 0.5
                                    ? 'success'
                                    : section.z_score < -0.5
                                      ? 'error'
                                      : 'default'
                                }
                                sx={{
                                  fontWeight: 'bold',
                                  bgcolor: getChipStyles(section.z_score).bgcolor,
                                  color: getChipStyles(section.z_score).color,
                                }}
                                size="small"
                                icon={
                                  <InfoOutlinedIcon fontSize="small" />
                                }
                              />
                            </Tooltip>
                            <Typography variant="caption" sx={{ ml: 1, color: '#888' }}>
                              {section.z_score > 0.5
                                ? 'Above Avg'
                                : section.z_score < -0.5
                                  ? 'Below Avg'
                                  : 'Near Avg'}
                            </Typography>
                          </Box>

                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={(
                                chartDetail === 'basic'
                                  ? Object.entries(section.grade_distribution)
                                  : Object.entries(section.detailed_grade_distribution)
                              ).map(([key, value]) => ({ grade: key, count: value }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="grade" />
                              <YAxis />
                              <RechartsTooltip formatter={(value, name) => [`${value} students`, `Grade: ${name}`]} />
                              <Bar dataKey="count" fill="#8884d8">
                                {(
                                  chartDetail === 'basic'
                                    ? Object.entries(section.grade_distribution)
                                    : Object.entries(section.detailed_grade_distribution)
                                ).map(([key], index) => (
                                  <Cell key={`cell-${index}`} fill={getGradeColor(key)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}
      </Box>
    );
  };

  const renderStudentsView = () => {
    if (!data.students || Object.keys(data.students).length === 0) {
      return <Alert severity="info">No student data available</Alert>;
    }

    return (
      <Box>
        <Box display="flex" gap={2} mb={2}>
          <FormControl fullWidth>
            <InputLabel id="course-filter-label">Filter by Course</InputLabel>
            <Select
              labelId="course-filter-label"
              value={selectedCourse}
              label="Filter by Course"
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <MenuItem value="all">All Courses</MenuItem>
              {courseOptions.filter(option => option !== 'all').map((course) => (
                <MenuItem key={course} value={course}>
                  {course}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="section-filter-label">Filter by Section</InputLabel>
            <Select
              labelId="section-filter-label"
              value={selectedSection}
              label="Filter by Section"
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <MenuItem value="all">All Sections</MenuItem>
              {sectionOptions.filter(option => option !== 'all').map((section) => (
                <MenuItem key={section} value={section}>
                  {section}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={createSortHandler('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'id'}
                    direction={orderBy === 'id' ? order : 'asc'}
                    onClick={createSortHandler('id')}
                  >
                    ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'gpa'}
                    direction={orderBy === 'gpa' ? order : 'asc'}
                    onClick={createSortHandler('gpa')}
                  >
                    GPA
                  </TableSortLabel>
                </TableCell>
                <TableCell>Courses</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.gpa.toFixed(2)}</TableCell>
                    <TableCell>
                      {student.courses.map((course: any) => {
                        // Determine if this is a special grade that doesn't affect GPA
                        const isSpecialGrade = ['W', 'I', 'NP'].includes(course.grade);

                        return (
                          <Chip
                            key={`${student.id}-${course.course}-${course.section}`}
                            label={`${course.course} (${course.grade}) - ${course.credit_hours} cr.`}
                            size="small"
                            sx={{
                              m: 0.3,
                              bgcolor: getGradeColor(course.grade),
                              color: isSpecialGrade ? 'white' :
                                ['A', 'B'].includes(course.grade.charAt(0)) ? 'white' : 'black',
                              fontStyle: isSpecialGrade ? 'italic' : 'normal'
                            }}
                          />
                        );
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No students found matching the search criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredStudents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid #e0e0e0',
              borderRadius: 0,
              boxShadow: 'none',
              '.MuiTablePagination-toolbar': {
                bgcolor: 'inherit',
                borderRadius: 0,
                fontWeight: 'bold',
                minHeight: 40,
                paddingLeft: 2,
                paddingRight: 2,
              },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                color: 'inherit',
                fontWeight: 'bold',
              },
              '.MuiTablePagination-actions button': {
                color: '#1976d2',
                fontWeight: 'bold',
                fontSize: 18,
              },
              '.MuiInputBase-root': {
                bgcolor: 'inherit',
                borderRadius: 0,
                fontWeight: 'bold',
              },
            }}
          />
        </TableContainer>
      </Box>
    );
  };

  // Render the appropriate view based on displayType
  switch (displayType) {
    case 'summary':
      return renderSummaryView();
    case 'courses':
      return renderCoursesView();
    case 'sections':
      return renderSectionsView();
    case 'students':
      return renderStudentsView();
    default:
      return <Alert severity="error">Invalid display type</Alert>;
  }
};
