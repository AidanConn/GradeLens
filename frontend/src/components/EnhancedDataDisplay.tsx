import React, { useState } from 'react';
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  Tooltip,
  Legend,
} from 'recharts';

interface EnhancedDataDisplayProps {
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
    'Other': '#607d8b',
  };

  if (grade.startsWith('A')) return gradeColors['A'];
  if (grade.startsWith('B')) return gradeColors['B'];
  if (grade.startsWith('C')) return gradeColors['C'];
  if (grade.startsWith('D')) return gradeColors['D'];
  if (grade === 'F') return gradeColors['F'];
  if (grade === 'W') return gradeColors['W'];
  return gradeColors['Other'];
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
 * <EnhancedDataDisplay 
 *   data={academicData} 
 *   displayType="summary" 
 *   searchTerm="smith"
 * />
 */
export const EnhancedDataDisplay: React.FC<EnhancedDataDisplayProps> = ({
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

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const COLORS = ['#4caf50', '#8bc34a', '#ffeb3b', '#ff9800', '#f44336', '#9e9e9e', '#607d8b'];

  // Generate course options from data
  const courseOptions = data.courses
    ? ['all', ...data.courses.map((course: any) => course.course_name)]
    : ['all'];
  
  // Generate section options
  const sectionOptions = data.courses
    ? ['all', ...data.courses.flatMap((course: any) => 
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

  const paginatedStudents = sortedStudents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const renderSummaryView = () => {
    if (!data.summary) return <Alert severity="info">No summary data available</Alert>;

    const { total_students, grade_distribution, detailed_grade_distribution, overall_gpa } = data.summary;
    const pieData = createPieData(grade_distribution);
    const detailedPieData = createPieData(detailed_grade_distribution);

    return (
      <Box>
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
                  {(((grade_distribution.A || 0) + (grade_distribution.B || 0) + (grade_distribution.C || 0)) / total_students * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Grade Distribution</Typography>
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
                <Tooltip formatter={(value) => [value, 'Students']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Detailed Grade Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={detailedPieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Students']} />
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

        {data.improvement_lists && (
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
                  {data.improvement_lists.work_list.slice(0, 10).map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.id}</TableCell>
                      <TableCell>{student.gpa.toFixed(2)}</TableCell>
                      <TableCell>
                        {student.courses.map((course: any) => (
                          <Chip
                            key={`${student.id}-${course.course}`}
                            label={`${course.course}: ${course.grade}`}
                            size="small"
                            color="error"
                            sx={{ m: 0.3 }}
                          />
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    );
  };

  const renderCoursesView = () => {
    if (!data.courses || data.courses.length === 0) {
      return <Alert severity="info">No course data available</Alert>;
    }

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
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={Object.entries(typeData.grade_distribution).map(([key, value]) => ({ grade: key, count: value }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="grade" />
                          <YAxis />
                          <Tooltip />
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

        <Typography variant="h6" gutterBottom>Course Details</Typography>
        {data.courses.map((course: any) => (
          <Accordion key={course.course_name} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {course.course_name} ({course.course_type})
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2">Students: {course.total_students}</Typography>
                  <Typography variant="body2">Avg GPA: {course.average_gpa.toFixed(2)}</Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Grade Distribution</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={Object.entries(course.grade_distribution).map(([key, value]) => ({ grade: key, count: value }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8">
                        {Object.entries(course.grade_distribution).map(([key, _value], index) => (
                          <Cell key={`cell-${index}`} fill={getGradeColor(key)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Detailed Grade Distribution</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={Object.entries(course.detailed_grade_distribution).map(([key, value]) => ({ grade: key, count: value }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8">
                        {Object.entries(course.detailed_grade_distribution).map(([key, _value], index) => (
                          <Cell key={`cell-${index}`} fill={getGradeColor(key)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  };

  const renderSectionsView = () => {
    if (!data.courses || data.courses.length === 0) {
      return <Alert severity="info">No section data available</Alert>;
    }

    return (
      <Box>
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
            {data.courses.map((course: any) => (
              <MenuItem key={course.course_name} value={course.course_name}>
                {course.course_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {data.courses
          .filter((course: any) => selectedCourse === 'all' || course.course_name === selectedCourse)
          .map((course: any) => (
            <Box key={course.course_name} mb={4}>
              <Typography variant="h6" gutterBottom>
                {course.course_name} Sections
              </Typography>

              <Grid container spacing={2}>
                {course.sections.map((section: any) => (
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
                            Avg GPA: {section.average_gpa.toFixed(2)}
                          </Typography>
                        </Box>

                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart 
                            data={Object.entries(section.grade_distribution).map(([key, value]) => ({ 
                              grade: key, 
                              count: value 
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="grade" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8">
                              {Object.entries(section.grade_distribution).map(([key, _value], index) => (
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
          ))}
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
                      {student.courses.map((course: any) => (
                        <Chip
                          key={`${student.id}-${course.course}-${course.section}`}
                          label={`${course.course} (${course.grade})`}
                          size="small"
                          sx={{ 
                            m: 0.3, 
                            bgcolor: getGradeColor(course.grade),
                            color: ['A', 'B'].includes(course.grade.charAt(0)) ? 'white' : 'black'
                          }}
                        />
                      ))}
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
