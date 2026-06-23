import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { FaSearch } from "react-icons/fa";
import { FaFilter } from "react-icons/fa";
import { FaBook } from "react-icons/fa";
import { FaGraduationCap } from "react-icons/fa";
import { FaSpinner } from "react-icons/fa";
import { FaCheckCircle } from "react-icons/fa";
import { FaClock } from "react-icons/fa";
import { FaListAlt } from "react-icons/fa";
import { FaChartLine } from "react-icons/fa";
import { FaStar } from "react-icons/fa";
import "./CurriculumPage.css";

import { getApiBase } from "../lib/apiBase";
const API_BASE = getApiBase();

// Helper to get grade color
const getGradeColor = (grade) => {
  if (!grade) return "var(--text-secondary)";
  const g = grade.toUpperCase();
  if (g === "A" || g === "A+") return "#22c55e";
  if (g === "A-") return "#4ade80";
  if (g === "B+" || g === "B") return "#3b82f6";
  if (g === "B-") return "#60a5fa";
  if (g === "C+" || g === "C") return "#f59e0b";
  if (g === "C-") return "#fbbf24";
  if (g === "D" || g === "D+" || g === "D-") return "#ef4444";
  if (g === "F") return "#dc2626";
  if (g === "IP" || g === "IN PROGRESS") return "#8b5cf6";
  return "var(--text-secondary)";
};

// Category order for sorting
const categoryOrder = {
  "General Education - IM": 1,
  "General Education - EC": 2,
  "General Education - CT": 3,
  "General Education - MQ": 4,
  "General Education - AH": 5,
  "General Education - BP": 6,
  "General Education - SB": 7,
  "General Education - Health/PE": 8,
  "General Education - CI": 9,
  "University Requirements": 10,
  "Supporting": 11,
  "Required": 12,
  "Group A Elective": 13,
  "Group B Elective": 14,
  "Group C Elective": 15,
  "Group D Elective": 16
};

export default function CurriculumPage() {
  const navigate = useNavigate();
  const [curriculumData, setCurriculumData] = useState([]);
  const [degreeInfo, setDegreeInfo] = useState({});
  const [electiveRequirements, setElectiveRequirements] = useState({});
  const [degreeWorksData, setDegreeWorksData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("all");
  const [manualStatuses, setManualStatuses] = useState({});

  // Load manual course statuses from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('curriculum_course_statuses');
    if (raw) {
      try {
        setManualStatuses(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to parse curriculum_course_statuses:', e);
      }
    }
  }, []);

  // Toggle course status (pending -> in-progress -> completed -> pending)
  const toggleCourseStatus = (courseCode) => {
    setManualStatuses(prev => {
      const current = prev[courseCode] || 'pending';
      const statusCycle = ['pending', 'in-progress', 'completed'];
      const currentIndex = statusCycle.indexOf(current);
      const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
      const next = { ...prev, [courseCode]: nextStatus };
      try {
        localStorage.setItem('curriculum_course_statuses', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save curriculum_course_statuses:', e);
      }
      return next;
    });
  };

  // Fetch curriculum data and DegreeWorks data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        // Fetch curriculum data
        const curriculumResponse = await fetch(`${API_BASE}/api/curriculum`);
        if (!curriculumResponse.ok) {
          throw new Error("Failed to fetch curriculum data");
        }
        const curriculumJson = await curriculumResponse.json();
        console.log("Curriculum API response:", curriculumJson);

        // Extract degree info and elective requirements
        setDegreeInfo(curriculumJson.degree_info || {});
        setElectiveRequirements(curriculumJson.elective_requirements || {});

        // Transform courses
        const courses = curriculumJson.courses || [];
        const transformedCurriculum = courses.map((course) => ({
          code: course.course_code || "",
          name: course.course_name || "",
          credits: course.credits || 0,
          category: course.category || "Other",
          requirement_type: course.requirement_type || "other",
          prereq: Array.isArray(course.prerequisites) && course.prerequisites.length > 0
            ? course.prerequisites.join(", ")
            : "None",
          offered: Array.isArray(course.offered)
            ? course.offered.join(", ")
            : course.offered || "TBD",
          elective_note: course.elective_note || null,
          note: course.note || null
        }));

        // Sort by category order
        transformedCurriculum.sort((a, b) => {
          const orderA = categoryOrder[a.category] || 99;
          const orderB = categoryOrder[b.category] || 99;
          return orderA - orderB;
        });

        setCurriculumData(transformedCurriculum);

        // Fetch DegreeWorks data if logged in
        if (token) {
          try {
            const dwResponse = await fetch(`${API_BASE}/api/degreeworks`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (dwResponse.ok) {
              const dwJson = await dwResponse.json();
              console.log("DegreeWorks API response:", dwJson);
              if (dwJson.connected && dwJson.data) {
                console.log("DegreeWorks data:", dwJson.data);
                setDegreeWorksData(dwJson.data);
              }
            }
          } catch (dwErr) {
            console.log("DegreeWorks data not available:", dwErr);
          }
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load curriculum data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Parse DegreeWorks courses
  const completedCourses = degreeWorksData?.courses_completed
    ? (typeof degreeWorksData.courses_completed === 'string'
        ? JSON.parse(degreeWorksData.courses_completed)
        : degreeWorksData.courses_completed)
    : [];

  const inProgressCourses = degreeWorksData?.courses_in_progress
    ? (typeof degreeWorksData.courses_in_progress === 'string'
        ? JSON.parse(degreeWorksData.courses_in_progress)
        : degreeWorksData.courses_in_progress)
    : [];

  // Create maps for quick lookup
  const completedCourseMap = new Map();
  completedCourses.forEach(c => {
    const code = c.code || c.course_code || "";
    completedCourseMap.set(code.toUpperCase().replace(/\s+/g, " ").trim(), c);
  });

  const inProgressCourseMap = new Map();
  inProgressCourses.forEach(c => {
    const code = c.code || c.course_code || "";
    inProgressCourseMap.set(code.toUpperCase().replace(/\s+/g, " ").trim(), c);
  });

  // Enhance curriculum data with completion status
  const enhancedCurriculum = curriculumData.map(course => {
    const normalizedCode = course.code.toUpperCase().replace(/\s+/g, " ").trim();
    const manualStatus = manualStatuses[course.code];
    
    // Use manual override if set, otherwise use DegreeWorks data
    let status, grade, semester;
    if (manualStatus) {
      status = manualStatus;
      grade = null;
      semester = null;
    } else {
      const completed = completedCourseMap.get(normalizedCode);
      const inProgress = inProgressCourseMap.get(normalizedCode);
      status = completed ? "completed" : inProgress ? "in-progress" : "pending";
      grade = completed?.grade || null;
      semester = completed?.semester || inProgress?.semester || null;
    }

    return {
      ...course,
      status,
      grade,
      semester
    };
  });

  // Get unique categories for filter
  const categories = ["All", ...new Set(curriculumData.map(c => c.category))];

  // Filter courses
  const filteredCourses = enhancedCurriculum.filter((course) => {
    const matchesSearch =
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.prereq.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.note || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.offered || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;

    let matchesTab = true;
    if (activeTab === "completed") matchesTab = course.status === "completed";
    else if (activeTab === "pending") matchesTab = course.status === "pending";
    else if (activeTab === "in-progress") matchesTab = course.status === "in-progress";

    return matchesSearch && matchesCategory && matchesTab;
  });

  // Calculate stats
  const completedCount = enhancedCurriculum.filter(c => c.status === "completed").length;
  const inProgressCount = enhancedCurriculum.filter(c => c.status === "in-progress").length;
  const pendingCount = enhancedCurriculum.filter(c => c.status === "pending").length;

  // Calculate credits
  const degreeCreditsRequired = degreeInfo.total_credits || 120;
  const completedCredits = enhancedCurriculum
    .filter(c => c.status === "completed")
    .reduce((sum, c) => sum + c.credits, 0);
  const inProgressCredits = enhancedCurriculum
    .filter(c => c.status === "in-progress")
    .reduce((sum, c) => sum + c.credits, 0);
  const progressPercentage = degreeCreditsRequired > 0
    ? Math.min(Math.round((completedCredits / degreeCreditsRequired) * 100), 100)
    : 0;

  // Group courses by category for display
  const groupedCourses = {};
  filteredCourses.forEach(course => {
    if (!groupedCourses[course.category]) {
      groupedCourses[course.category] = [];
    }
    groupedCourses[course.category].push(course);
  });

  // Category descriptions
  const categoryDescriptions = {
    "General Education - IM": "Information, Technological and Media Literacy: complete 3 credits from an approved option or the computer literacy course required by the major",
    "General Education - EC": "English Composition: complete Part A and Part B for 6 credits with required sequence grades",
    "General Education - CT": "Critical Thinking: complete one approved 3-credit course",
    "General Education - MQ": "Mathematics and Quantitative Reasoning: complete MATH 109 or above; CS majors typically satisfy this through MATH 241",
    "General Education - AH": "Arts and Humanities: complete 6 credits from two different disciplines; Foreign Language 102 or higher is also an approved option",
    "General Education - BP": "Biological and Physical Sciences: complete 7 credits across two courses; at least one must be lab-based",
    "General Education - SB": "Social and Behavioral Sciences: complete 6 credits from two different disciplines",
    "General Education - Health/PE": "Health and Healthful Living: complete one approved 3-credit HH option",
    "General Education - CI": "Contemporary and Global Issues, Ideas and Values: complete one approved 3-credit option",
    "University Requirements": "Complete 2 university requirement credits: one activity/financial literacy option and one school orientation course",
    "Supporting": "Required mathematics and ethics courses (15 credits)",
    "Required": "Core computer science courses required for all majors (35 credits)",
    "Group A Elective": electiveRequirements.group_a?.description || "Choose 3 courses",
    "Group B Elective": electiveRequirements.group_b?.description || "Choose 2 courses",
    "Group C Elective": electiveRequirements.group_c?.description || "Choose 4 courses",
    "Group D Elective": electiveRequirements.group_d?.description || "Choose 1 course"
  };

  return (
    <div className="curriculum-page">
      {/* Header Section */}
      <div className="curriculum-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate("/")}>
            <FaArrowLeft size={18} />
            <span>Back to Chat</span>
          </button>

          <div className="header-title">
            <FaGraduationCap size={40} className="header-icon" />
            <div>
              <h1>{degreeInfo.program || "Computer Science, B.S."}</h1>
              <p>{degreeInfo.university || "Morgan State University"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Degree Progress Section */}
      <div className="progress-section">
        <div className="progress-card">
          <div className="progress-header">
            <div className="progress-info">
              <FaChartLine size={24} className="progress-icon" />
              <div>
                <h2>Degree Progress</h2>
                <p>General Education + University + Supporting + Major Requirements ({degreeCreditsRequired} credits)</p>
              </div>
            </div>
            <div className="progress-stats">
              <span className="credits-text">
                <strong>{completedCredits}</strong> / {degreeCreditsRequired} credits
              </span>
              {degreeWorksData?.overall_gpa && (
                <span className="gpa-badge">
                  GPA: <strong>{degreeWorksData.overall_gpa?.toFixed(2)}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercentage}%` }}
            >
              <span className="progress-percentage">{progressPercentage}%</span>
            </div>
          </div>

          <div className="progress-legend">
            <div className="legend-item completed">
              <FaCheckCircle /> <span>{completedCount} Completed ({completedCredits} cr)</span>
            </div>
            <div className="legend-item in-progress">
              <FaClock /> <span>{inProgressCount} In Progress ({inProgressCredits} cr)</span>
            </div>
            <div className="legend-item pending">
              <FaListAlt /> <span>{pendingCount} Remaining</span>
            </div>
          </div>

          {/* Degree Requirements Summary */}
          <div className="degree-summary">
            <div className="summary-item">
              <span className="summary-label">General Education</span>
              <span className="summary-value">{degreeInfo.general_education_credits ? `${degreeInfo.general_education_credits} cr` : "~44 cr*"}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Supporting Courses</span>
              <span className="summary-value">{degreeInfo.supporting_credits ? `${degreeInfo.supporting_credits} cr` : "~15 cr*"}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Major Requirements</span>
              <span className="summary-value">{degreeInfo.major_credits ? `${degreeInfo.major_credits} cr` : "~65 cr*"}</span>
            </div>
            <div className="summary-item total">
              <span className="summary-label">Total for Degree</span>
              <span className="summary-value">{degreeInfo.total_credits ? `${degreeInfo.total_credits} cr` : "~120 cr*"}</span>
            </div>
            {(!degreeInfo.general_education_credits || !degreeInfo.total_credits) && (
              <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "4px" }}>*Approximate values. Sync DegreeWorks for exact numbers.</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stat-card">
          <FaBook size={24} />
          <div>
            <div className="stat-number">{curriculumData.length}</div>
            <div className="stat-label">Total Courses</div>
          </div>
        </div>
        <div className="stat-card">
          <FaStar size={24} />
          <div>
            <div className="stat-number">
              {curriculumData.filter(c => c.requirement_type !== "other").length}
            </div>
            <div className="stat-label">Tracked Requirements</div>
          </div>
        </div>
        <div className="stat-card">
          <FaFilter size={24} />
          <div>
            <div className="stat-number">{filteredCourses.length}</div>
            <div className="stat-label">Showing</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <FaListAlt /> All Courses
        </button>
        <button
          className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          <FaCheckCircle /> Completed ({completedCount})
        </button>
        <button
          className={`tab-btn ${activeTab === "in-progress" ? "active" : ""}`}
          onClick={() => setActiveTab("in-progress")}
        >
          <FaClock /> In Progress ({inProgressCount})
        </button>
        <button
          className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <FaBook /> Pending ({pendingCount})
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search courses by code, name, or prerequisites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses by Category */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <FaSpinner className="spinner" size={40} />
            <p>Loading curriculum data...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-btn">
              Try Again
            </button>
          </div>
        ) : (
          Object.entries(groupedCourses).map(([category, courses]) => (
            <div key={category} className="category-section">
              <div className="category-header">
                <h3 className={`category-title ${category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {category}
                  <span className="course-count">({courses.length} courses)</span>
                </h3>
                <p className="category-description">{categoryDescriptions[category]}</p>
              </div>

              <table className="curriculum-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Credits</th>
                    <th>Grade</th>
                    <th>Prerequisites</th>
                    <th>Offered</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.code} className={`course-row ${course.status}`}>
                      <td className="course-status">
                        <button
                          className="status-badge-btn"
                          onClick={() => toggleCourseStatus(course.code)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleCourseStatus(course.code);
                            }
                          }}
                          title={`Click to toggle: ${course.status}`}
                          aria-label={`Toggle status for ${course.code}: currently ${course.status}`}
                        >
                          {course.status === "completed" && (
                            <span className="status-badge completed" title="Completed">
                              <FaCheckCircle />
                            </span>
                          )}
                          {course.status === "in-progress" && (
                            <span className="status-badge in-progress" title="In Progress">
                              <FaClock />
                            </span>
                          )}
                          {course.status === "pending" && (
                            <span className="status-badge pending" title="Not Started">
                              <FaBook />
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="course-code">{course.code}</td>
                      <td className="course-name">
                        {course.name}
                        {course.note && <span className="course-note">*</span>}
                      </td>
                      <td className="course-credits">{course.credits}</td>
                      <td className="course-grade">
                        {course.grade ? (
                          <span
                            className="grade-badge"
                            style={{
                              backgroundColor: `${getGradeColor(course.grade)}20`,
                              color: getGradeColor(course.grade),
                              border: `1px solid ${getGradeColor(course.grade)}40`
                            }}
                          >
                            {course.grade}
                          </span>
                        ) : course.status === "in-progress" ? (
                          <span className="grade-badge in-progress">IP</span>
                        ) : (
                          <span className="grade-na">--</span>
                        )}
                      </td>
                      <td className="course-prereq">{course.prereq}</td>
                      <td className="course-offered">{course.offered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        {!loading && !error && Object.keys(groupedCourses).length === 0 && (
          <div className="empty-state-container">
            <p className="empty-state">No courses found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Connect DegreeWorks prompt */}
      {!degreeWorksData && !loading && (
        <div className="connect-prompt">
          <p>
            <strong>Want to track your progress?</strong> Connect your DegreeWorks account to see your completed courses, grades, and remaining requirements.
          </p>
          <button onClick={() => navigate("/")} className="connect-btn">
            Go to Profile to Connect
          </button>
        </div>
      )}
    </div>
  );
}
