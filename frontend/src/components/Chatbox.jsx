import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';

import { FaMicrophone } from "react-icons/fa";
import { FaPaperclip } from "react-icons/fa";
import { FaVolumeUp } from "react-icons/fa";
import { FaTimes } from "react-icons/fa";
import { FaStop } from "react-icons/fa";
import { FaEllipsisV } from "react-icons/fa";
import { FaThumbsUp } from "react-icons/fa";
import { FaThumbsDown } from "react-icons/fa";
import { FaFlag } from "react-icons/fa";
import { BsSoundwave, BsArrowUpCircleFill } from "react-icons/bs";

// 🔥 Icons for File Cards
import { FaFile } from "react-icons/fa";
import { FaFilePdf } from "react-icons/fa";
import { FaFileWord } from "react-icons/fa";
import { FaFileImage } from "react-icons/fa";

import "./Chatbox.css";

// Featured questions that showcase chatbot capabilities
const FEATURED_QUESTIONS = [
  "What's the difference between the B.S. in CS and Cloud Computing?",
  "What are the prerequisites for COSC 220 Data Structures?",
  "Who is the chair of the CS department and how do I contact them?",
  "How do I request a course override or substitute a requirement?",
  "What Group A and Group B electives should I take as a junior?",
  "Tell me about the 4+1 accelerated B.S./M.S. program",
  "Where can I get tutoring for intro CS courses like COSC 111?",
  "What scholarships are available for CS majors at Morgan State?",
];

import { getApiBase } from "../lib/apiBase";
const API_BASE = getApiBase();
const CHAT_MODEL = "inav-1.1";

const CHAT_MODES = [
  { id: "general", name: "iNav", desc: "General chatbot" },
  { id: "advising", name: "Advising", desc: "Student advising" },
];

const ADVISING_STEP_ONE_URL = "https://example.com/internship-form";
const ADVISING_STEP_ONE_TITLE = "Academic Year 2025/2026 Internship, Research, Job Experience Form";
const ADVISING_FLOW_STORAGE_KEY = "chat_advising_flow_state";
const ADVISING_LOCAL_ANSWERS_STORAGE_KEY = "chat_advising_local_answers";
const CURRICULUM_STATUS_STORAGE_KEY = "curriculum_course_statuses";
const STEP_ONE_STUDENT_FIELDS = [
  "First Name",
  "Last Name",
  "Major",
  "Email receipt",
  "Gender",
  "Transfer student status",
  "SCMNS club or organization interests",
  "Career interest",
  "SCMNS graduate programs awareness",
  "Campus research interest",
  "Research presentations this academic year",
  "Publication this academic year",
  "Internship, research, or job participation in 2025/2026",
  "Canvas assignment posting timeliness",
  "Canvas grading before midterms timeliness",
];

const STEP_ONE_CONDITIONAL_SECTIONS = [
  "If the student presented research: number of presentations, type, title, conference, location, and date for each presentation.",
  "If the student had a publication: publication title, date, and location.",
  "If the student participated in an internship, research, or job: experience type, mentor if research, sector, program or employer, address, title, education relevance, career relevance, and whether there was a second experience.",
  "If the student did not apply for an internship, research, or job: why they did not apply.",
];

const ADVISING_STUDENT_FIELDS = [
  "First Name",
  "Last Name",
  "SID",
  "Major",
  "Minor (if applicable)",
  "MSU Email",
  "Classification",
  "Credits",
  "Advisor",
  "GPA",
  "Graduation Date",
  "Advisement Semester",
  "Courses currently being pursued",
  "Do you plan to work next semester?",
  "Career Goals",
  "Student selected courses",
  "Do all selected courses fulfill outstanding curricular components?",
  "Explanation for any non-curricular selected course",
  "Student Submission Date",
];

const ADVISING_COURSE_SELECTION_GOALS = [
  "Use completed and in-progress curriculum courses to determine prerequisite readiness.",
  "Recommend next-semester courses that satisfy outstanding curriculum requirements whenever possible.",
  "Align selected courses with the student's career goals, work plans, graduation timeline, GPA, and credit-load needs.",
  "Flag any selected course that does not fulfill an outstanding curricular component and explain why it still makes sense.",
  "Produce an advisor-ready summary with selected courses, rationale, prerequisite status, and approval notes.",
];

const hasProfileValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const firstProfileValue = (...values) => values.find(hasProfileValue);

const splitProfileName = (profile, degreeWorksProfile) => {
  const fullName = firstProfileValue(profile?.name, degreeWorksProfile?.student_name);
  if (!hasProfileValue(fullName)) return {};
  const normalizedName = `${fullName}`.replace(/\s+/g, " ").trim();

  if (normalizedName.includes(",")) {
    const [lastNamePart, firstNamePart] = normalizedName.split(",", 2);
    const firstName = firstNamePart?.trim().split(/\s+/)[0];
    const lastName = lastNamePart?.trim();
    return {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    };
  }

  const nameParts = normalizedName.split(/\s+/);
  return {
    firstName: nameParts[0],
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
  };
};

const STEP_ONE_PROFILE_FIELD_EXTRACTORS = {
  "First Name": (profile, degreeWorksProfile) => splitProfileName(profile, degreeWorksProfile).firstName,
  "Last Name": (profile, degreeWorksProfile) => splitProfileName(profile, degreeWorksProfile).lastName,
  "Major": (profile, degreeWorksProfile) => firstProfileValue(profile?.major, degreeWorksProfile?.degree_program),
  "Email receipt": (profile) => firstProfileValue(profile?.email),
};

const ADVISING_PROFILE_FIELD_EXTRACTORS = {
  "First Name": (profile, degreeWorksProfile) => splitProfileName(profile, degreeWorksProfile).firstName,
  "Last Name": (profile, degreeWorksProfile) => splitProfileName(profile, degreeWorksProfile).lastName,
  "SID": (profile, degreeWorksProfile) => firstProfileValue(profile?.studentId, degreeWorksProfile?.student_id),
  "Major": (profile, degreeWorksProfile) => firstProfileValue(profile?.major, degreeWorksProfile?.degree_program),
  "MSU Email": (profile) => firstProfileValue(profile?.email),
  "Classification": (profile, degreeWorksProfile) => firstProfileValue(degreeWorksProfile?.classification),
  "Credits": (profile, degreeWorksProfile) => firstProfileValue(degreeWorksProfile?.total_credits_earned),
  "Advisor": (profile, degreeWorksProfile) => firstProfileValue(degreeWorksProfile?.advisor),
  "GPA": (profile, degreeWorksProfile) => firstProfileValue(degreeWorksProfile?.overall_gpa),
  "Courses currently being pursued": (profile, degreeWorksProfile, inProgress) => inProgress?.length ? inProgress : undefined,
  "Student Submission Date": () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
};

const formatFieldList = (fields) => fields.length > 0 ? fields.join(", ") : "none";

const formatAdvisingValue = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  return `${value}`.trim();
};

const sanitizeAssistantMessage = (text) => {
  if (!text) return "";
  return text
    .replace(/\[YES\/NO_QUESTION\]:\s*/g, "")
    .replace(/\[(?:STEP ONE FORM CONTEXT|ADVISING MODE CONTEXT)\]/g, "")
    .replace(/^\s*(?:Known Step One values|Known advising values|Locally captured Step One\/Two answers|Student profile already has these fields|Only ask the student|Efficiency rule|Faculty advising rule|Prerequisite planning rule|Course selection goals):.*$/gmi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const getVisibleUserMessage = (text) => {
  if (!text) return "";
  const hasHiddenContext = /\[(?:STEP ONE FORM CONTEXT|ADVISING MODE CONTEXT)\]/.test(text);
  if (!hasHiddenContext) return sanitizeAssistantMessage(text);
  const visibleTail = text.split(/\n\n/).pop() || text;
  return sanitizeAssistantMessage(visibleTail);
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const updateMessageById = (messages, messageId, patch) => (
  messages.map((message) => (
    message.id === messageId
      ? { ...message, ...(typeof patch === "function" ? patch(message) : patch) }
      : message
  ))
);

const removeMessageById = (messages, messageId) => messages.filter((message) => message.id !== messageId);

const buildBinaryQuestion = (questionText) => `[YES/NO_QUESTION]: ${questionText}`;

const classifyAdvisingBinaryQuestion = (questionText) => {
  const text = `${questionText || ""}`.toLowerCase();
  if (text.includes("ready") && text.includes("step two")) return "ready_step_two";
  if (text.includes("graduate program")) return "grad_program_awareness";
  if (text.includes("campus research") || text.includes("conduct research")) return "campus_research_interest";
  if (text.includes("research presentation") || text.includes("research presentations")) return "research_presentations";
  if (text.includes("publication") || text.includes("publications")) return "publications";
  if ((text.includes("apply") || text.includes("applied")) && (text.includes("not selected") || text.includes("weren't selected") || text.includes("were not selected"))) return "experience_applied_not_selected";
  if ((text.includes("internship") || text.includes("job experience") || text.includes("research, or job")) && !text.includes("second")) return "experience_participation";
  if (text.includes("second") && (text.includes("internship") || text.includes("research") || text.includes("job"))) return "second_experience";
  if (text.includes("minor")) return "has_minor";
  if (text.includes("work next semester")) return "work_next_semester";
  if (text.includes("selected courses") && (text.includes("fulfill") || text.includes("outstanding curricular"))) return "selected_courses_curricular_fit";
  if (text.includes("confirm") || text.includes("approval") || text.includes("submit")) return "confirm_advising_draft";
  return null;
};

// Helper for icons
const getFileIcon = (filename) => {
  if (!filename) return <FaFile className="file-icon generic" />;
  const ext = filename.split('.').pop().toLowerCase();
  
  if (ext === 'pdf') return <FaFilePdf className="file-icon pdf" />;
  if (['doc', 'docx'].includes(ext)) return <FaFileWord className="file-icon word" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FaFileImage className="file-icon image" />;
  
  return <FaFile className="file-icon generic" />;
};

export default function Chatbox({ initialMessages = [], onSessionChange, sessionId, mode, onModeChange }) {
  // --- STATE ---
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState("/user_icon.webp");
  const [userProfile, setUserProfile] = useState(null);
  const [degreeWorksProfile, setDegreeWorksProfile] = useState(null);

  // 🔥 Staging State for File Uploads
  const [pendingFile, setPendingFile] = useState(null);

  // 🔥 Dynamic Suggestions State
  const [suggestions, setSuggestions] = useState(FEATURED_QUESTIONS);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // 🔥 Voice Mode State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle"); // idle, listening, processing, speaking

  // Mode selector state
  const [selectedMode, setSelectedMode] = useState(() => mode || localStorage.getItem("chat_mode") || "general");
  const [advisingFlowStep, setAdvisingFlowStep] = useState(() => {
    const savedStep = localStorage.getItem(ADVISING_FLOW_STORAGE_KEY);
    return savedStep === "step1_redirect" ? "step1_ready" : savedStep || "step1_check";
  });
  const [advisingLocalAnswers, setAdvisingLocalAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ADVISING_LOCAL_ANSWERS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [completedCourses, setCompletedCourses] = useState([]);
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [isGeneratingAdvisementPdf, setIsGeneratingAdvisementPdf] = useState(false);
  const previousModeRef = useRef(selectedMode);
  const lastGeneratedAdvisementPdfKeyRef = useRef("");

  const remainingStepOneFields = useMemo(() => (
    STEP_ONE_STUDENT_FIELDS.filter((field) => {
      const isCompletedInProfile = hasProfileValue(STEP_ONE_PROFILE_FIELD_EXTRACTORS[field]?.(userProfile, degreeWorksProfile));
      return !isCompletedInProfile;
    })
  ), [degreeWorksProfile, userProfile]);

  const completedProfileStepOneFields = useMemo(() => (
    STEP_ONE_STUDENT_FIELDS.filter((field) => hasProfileValue(STEP_ONE_PROFILE_FIELD_EXTRACTORS[field]?.(userProfile, degreeWorksProfile)))
  ), [degreeWorksProfile, userProfile]);

  const stepOneKnownFacts = useMemo(() => (
    STEP_ONE_STUDENT_FIELDS
      .map((field) => ({
        field,
        value: STEP_ONE_PROFILE_FIELD_EXTRACTORS[field]?.(userProfile, degreeWorksProfile),
      }))
      .filter((fact) => hasProfileValue(fact.value))
      .map((fact) => ({ ...fact, value: formatAdvisingValue(fact.value) }))
  ), [degreeWorksProfile, userProfile]);

  const stepOneKnownFactText = useMemo(() => (
    stepOneKnownFacts.length > 0
      ? stepOneKnownFacts.map((fact) => `- ${fact.field}: ${fact.value}`).join("\n")
      : "- None available yet"
  ), [stepOneKnownFacts]);

  const remainingAdvisingStudentFields = useMemo(() => (
    ADVISING_STUDENT_FIELDS.filter((field) => {
      const isCompletedInProfile = hasProfileValue(ADVISING_PROFILE_FIELD_EXTRACTORS[field]?.(userProfile, degreeWorksProfile, inProgressCourses));
      return !isCompletedInProfile;
    })
  ), [degreeWorksProfile, inProgressCourses, userProfile]);

  const completedProfileAdvisingFields = useMemo(() => (
    ADVISING_STUDENT_FIELDS.filter((field) => hasProfileValue(ADVISING_PROFILE_FIELD_EXTRACTORS[field]?.(userProfile, degreeWorksProfile, inProgressCourses)))
  ), [degreeWorksProfile, inProgressCourses, userProfile]);

  const advisingKnownFacts = useMemo(() => (
    ADVISING_STUDENT_FIELDS
      .map((field) => ({
        field,
        value: ADVISING_PROFILE_FIELD_EXTRACTORS[field]?.(userProfile, degreeWorksProfile, inProgressCourses),
      }))
      .filter((fact) => hasProfileValue(fact.value))
      .map((fact) => ({ ...fact, value: formatAdvisingValue(fact.value) }))
  ), [degreeWorksProfile, inProgressCourses, userProfile]);

  const advisingKnownFactText = useMemo(() => (
    advisingKnownFacts.length > 0
      ? advisingKnownFacts.map((fact) => `- ${fact.field}: ${fact.value}`).join("\n")
      : "- None available yet"
  ), [advisingKnownFacts]);

  useEffect(() => {
    if (mode && mode !== selectedMode) {
      setSelectedMode(mode);
    }
  }, [mode, selectedMode]);

  useEffect(() => {
    localStorage.setItem("chat_mode", selectedMode);
  }, [selectedMode]);

  useEffect(() => {
    localStorage.setItem(ADVISING_FLOW_STORAGE_KEY, advisingFlowStep);
  }, [advisingFlowStep]);

  useEffect(() => {
    localStorage.setItem(ADVISING_LOCAL_ANSWERS_STORAGE_KEY, JSON.stringify(advisingLocalAnswers));
  }, [advisingLocalAnswers]);

  const loadCompletedCourses = useCallback(() => {
    try {
      const raw = localStorage.getItem(CURRICULUM_STATUS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Object.entries(parsed)
        .filter(([, status]) => status === "completed")
        .map(([courseCode]) => courseCode)
        .sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
  }, []);

  // 🔥 Load full curriculum status (completed + in-progress) for advising mode
  const loadInProgressCourses = useCallback(() => {
    try {
      const raw = localStorage.getItem(CURRICULUM_STATUS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Object.entries(parsed)
        .filter(([, status]) => status === "in_progress")
        .map(([courseCode]) => courseCode)
        .sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
  }, []);

  const loadCurriculumStatus = useCallback(() => {
    try {
      const raw = localStorage.getItem(CURRICULUM_STATUS_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (selectedMode === "advising") {
      setCompletedCourses(loadCompletedCourses());
      setInProgressCourses(loadInProgressCourses());
    }
  }, [loadCompletedCourses, loadInProgressCourses, selectedMode]);

  useEffect(() => {
    if (selectedMode === "advising" && previousModeRef.current !== "advising") {
      setAdvisingFlowStep("step1_check");
      setCompletedCourses(loadCompletedCourses());
      setInProgressCourses(loadInProgressCourses());
    }
    previousModeRef.current = selectedMode;
  }, [loadCompletedCourses, loadInProgressCourses, selectedMode]);

  // 🔥 Feedback State
  const [feedbackMenuOpen, setFeedbackMenuOpen] = useState(null); // index of message with open menu
  const [feedbackGiven, setFeedbackGiven] = useState({}); // {messageIndex: 'helpful' | 'not_helpful' | 'reported'}
  const [reportModal, setReportModal] = useState(null); // index of message being reported
  const [reportText, setReportText] = useState("");

  // 🔥 Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);

  // Thinking status - step index drives everything
  const [thinkingStepIndex, setThinkingStepIndex] = useState(0);
  const [thinkingTimer, setThinkingTimer] = useState(0);
  const thinkingMessages = [
    "Understanding your question",
    "Searching knowledge base",
    "Analyzing results",
    "Preparing response"
  ];
  // Derived: completed steps are all before current index, active is current
  const thinkingStatus = thinkingMessages[thinkingStepIndex] || thinkingMessages[0];

  // Map status text to contextual SVG icon
  const getStatusIcon = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("search") || s.includes("knowledge"))
      return ( // magnifying glass
        <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-search"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/><path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      );
    if (s.includes("understand") || s.includes("analyz") || s.includes("question"))
      return ( // brain / lightbulb
        <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-think"><path d="M10 2a5.5 5.5 0 00-2 10.63V15a1 1 0 001 1h2a1 1 0 001-1v-2.37A5.5 5.5 0 0010 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 17h4M9 19h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      );
    if (s.includes("consult") || s.includes("specialist") || s.includes("agent"))
      return ( // people / transfer
        <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-consult"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="15" cy="6" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M19 15c0-2.2-1.8-4-4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      );
    if (s.includes("process") || s.includes("compil") || s.includes("generat"))
      return ( // gear
        <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-process"><path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M16.07 3.93l-1.41 1.41M5.34 14.66l-1.41 1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      );
    if (s.includes("prepar") || s.includes("writing") || s.includes("response"))
      return ( // pen / writing
        <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-write"><path d="M13.586 3.586a2 2 0 012.828 2.828l-9.5 9.5-3.5 1 1-3.5 9.172-9.828z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 5l3 3" stroke="currentColor" strokeWidth="1.3"/></svg>
      );
    if (s.includes("review") || s.includes("catalog") || s.includes("course"))
      return ( // book
        <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-book"><path d="M3 4a1 1 0 011-1h4a3 3 0 013 3v11a2 2 0 00-2-2H4a1 1 0 01-1-1V4zM17 4a1 1 0 00-1-1h-4a3 3 0 00-3 3v11a2 2 0 012-2h4a1 1 0 001-1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
      );
    if (s.includes("department") || s.includes("info") || s.includes("check"))
      return ( // info/clipboard
        <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-info"><rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 6h4M8 10h4M8 14h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      );
    // Default: sparkle
    return (
      <svg viewBox="0 0 20 20" fill="none" className="status-icon icon-default"><path d="M10 2l1.5 5L17 8.5l-5 2L10 16l-2-5.5L3 8.5l5-1L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
    );
  };

  // --- REFS ---
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const isVoiceModeRef = useRef(false); // 🔥 Ref to track voice mode for callbacks

  // --- EFFECTS ---

  // 1. Focus input on load
  useEffect(() => { 
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener('focus', focusInput);
    return () => window.removeEventListener('focus', focusInput);
  }, []);

  // 2. Sync Messages FROM Parent (Database Load)
  useEffect(() => {
    if (JSON.stringify(initialMessages) !== JSON.stringify(messages)) {
      isRemoteUpdate.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // 3. Sync Messages TO Parent (User typed something)
  useEffect(() => {
    if (!onSessionChange) return;
    if (isRemoteUpdate.current) { 
        isRemoteUpdate.current = false; 
        return; 
    }
    onSessionChange(messages);
  }, [messages, onSessionChange]);

  // 4. Auto-Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. Fetch User Profile Picture
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
          if (data.profilePicture) {
             // Handle base64 data URLs, full URLs, and relative paths
             let picUrl = data.profilePicture;
             if (picUrl.startsWith("data:")) {
                // Base64 data URL - use directly
                setUserProfilePicture(picUrl);
             } else if (picUrl.startsWith("http")) {
                // Full URL - use directly
                setUserProfilePicture(picUrl);
             } else {
                // Relative path - prepend API base
                setUserProfilePicture(`${API_BASE}${picUrl}`);
             }
          }
        }
      } catch (error) {
        console.error("❌ Profile Error:", error);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchDegreeWorksProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/api/degreeworks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDegreeWorksProfile(data.connected ? data.data : null);
        }
      } catch (error) {
        console.error("DegreeWorks profile error:", error);
      }
    };
    fetchDegreeWorksProfile();
  }, []);

  // 6. Fetch randomized featured questions from backend (NOT for advising mode)
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Disable random questions on advising mode to avoid confusing students
      if (selectedMode === "advising") {
        setSuggestions([]);
        setSuggestionsLoading(false);
        return;
      }

      if (messages.length > 0) {
        setSuggestionsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/api/popular-questions`);
        if (response.ok) {
          const data = await response.json();
          if (data.questions && data.questions.length > 0) {
            setSuggestions(data.questions.slice(0, 8));
          }
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        setSuggestionsLoading(false);
      }
    };
    fetchSuggestions();
  }, [selectedMode]);

  // 7. Cleanup voice mode on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // 8. Cycle through thinking steps while waiting for response
  const streamingNoText = messages.some(m => m.isStreaming && !m.text);
  const showThinking = isLoading || streamingNoText;

  useEffect(() => {
    if (!showThinking) {
      setThinkingTimer(0);
      return;
    }

    setThinkingTimer(0);

    // Advance to next step every 1.8s
    const statusInterval = setInterval(() => {
      setThinkingStepIndex(prev => {
        if (prev < thinkingMessages.length - 1) return prev + 1;
        return prev; // Stay on last step until text arrives
      });
    }, 1800);

    // Timer
    const timerInterval = setInterval(() => {
      setThinkingTimer(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(timerInterval);
    };
  }, [showThinking]);

  // --- HANDLERS ---

  // Helper to add message to local state
  const addMessage = (text, sender) => {
    const id = createMessageId();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id, text, sender, time }]);
    return id;
  };

  // 🔥 BINARY QUESTION DETECTION - For [YES/NO_QUESTION]: markers
  const detectBinaryQuestion = (text) => {
    if (!text || selectedMode !== "advising") return null;
    const matches = [...text.matchAll(/\[YES\/NO_QUESTION\]:\s*(.+?)(?:\n|$)/g)];
    if (matches.length !== 1) return null;
    const match = matches[0];
    if (match) {
      return {
        questionText: match[1].trim(),
        fullText: text
      };
    }
    return null;
  };

  const buildAdvisingContextMessage = (userText) => {
    if (selectedMode !== "advising") return userText;
    const localAnswerText = Object.keys(advisingLocalAnswers).length > 0
      ? Object.entries(advisingLocalAnswers).map(([field, value]) => `- ${field}: ${value}`).join("\n")
      : "- None captured locally yet";

    if (advisingFlowStep === "step1_ready") {
      return `[STEP ONE FORM CONTEXT]\nForm title: ${ADVISING_STEP_ONE_TITLE}\nRequired flow: complete Step One, the Internship/Research/Job Experience Form, before starting Step Two.\nStep One focus: Internship, Research, Job Experience Form only.\nKnown Step One values from saved profile/DegreeWorks; use these directly and do not ask the student for them again:\n${stepOneKnownFactText}\nLocally captured Step One/Two answers; treat these as already answered and do not ask again:\n${localAnswerText}\nStudent profile already has these Step One fields; never re-ask them: ${formatFieldList(completedProfileStepOneFields)}.\nOnly ask the student to answer these remaining starting fields: ${formatFieldList(remainingStepOneFields)}.\nConditional sections from the original form:\n${STEP_ONE_CONDITIONAL_SECTIONS.map((section) => `- ${section}`).join("\n")}\nEfficiency rule: ask for at most 3 missing fields at a time, group related fields, and skip anything already known from profile, DegreeWorks, curriculum, local answers, or conversation history.\nBinary question rule: ask only one yes/no question per turn. If a yes/no question is needed, ask only that question and wait for the student to answer before asking another yes/no or any follow-up details.\nReadable formatting rule: use short Markdown sections, blank lines, and bullets. Do not send a dense paragraph of required fields.\nContinuity rule: after processing the student's answer, always continue with the next Step One form field or summarize Step One and ask whether they are ready for Step Two. Do not stop without a next question or next action.\nDo not move to Step Two until Step One values are summarized and the student confirms they are ready to continue.\n\n${userText}`;
    }

    if (advisingFlowStep === "step2_ready") {
      const courseSummary = completedCourses.length > 0 ? completedCourses.join(", ") : "none recorded yet";
      const inProgressSummary = inProgressCourses.length > 0 ? inProgressCourses.join(", ") : "none recorded yet";
      return `[ADVISING MODE CONTEXT]\nStep One completed: yes\nRequired flow: Step One is complete, so continue Step Two, the Academic Advisement Form, until the advisor-ready draft is confirmed.\nStep Two focus: Academic Advisement Form and next-semester course selection.\nAdvisor-facing form sections: Student Information, Courses Currently Being Pursued, Student Selected Courses, curriculum-fit acknowledgement, explanation for any non-curricular course, Advisor Edits/Comments, Student Submission Date, Advisor Approval Date.\nCompleted curriculum courses: ${courseSummary}\nCourses currently being pursued: ${inProgressSummary}\nPrerequisite planning rule: in-progress courses count as satisfying prerequisites for registration planning, but say the eligibility is conditional on successful completion of the in-progress prerequisite.\nKnown advising values from saved profile/DegreeWorks/curriculum; use these directly and do not ask the student for them again:\n${advisingKnownFactText}\nLocally captured Step One/Two answers; treat these as already answered and do not ask again:\n${localAnswerText}\nStudent profile already has these fields; never re-ask them: ${formatFieldList(completedProfileAdvisingFields)}.\nOnly ask the student to answer these remaining advisor-form fields: ${formatFieldList(remainingAdvisingStudentFields)}.\nCourse selection goals:\n${ADVISING_COURSE_SELECTION_GOALS.map((goal) => `- ${goal}`).join("\n")}\nEfficiency rule: ask for at most 3 missing fields at a time, group related fields, and skip anything already known from profile, DegreeWorks, curriculum, local answers, or conversation history.\nBinary question rule: ask only one yes/no question per turn. If a yes/no question is needed, ask only that question and wait for the student to answer before asking another yes/no or any follow-up details.\nReadable formatting rule: use short Markdown sections, blank lines, and bullets. Do not send a dense paragraph of required fields.\nFaculty advising rule: determine the student's goals first, then recommend classes that best align with those goals while satisfying prerequisites and outstanding curriculum requirements.\nWhen enough information is available, propose Student Selected Courses for next semester with a short rationale for each course, prerequisite status, and career-goal fit.\nIf a recommended course does not clearly fulfill an outstanding curricular component, ask for or provide the explanation required by the form.\nContinuity rule: after processing the student's answer, always continue with the next Step Two form field, a course-planning recommendation, or the advisor-ready Step Two draft. Do not stop without a next question or next action.\nWhen the plan is ready, summarize the advisor-ready Step Two draft and ask for confirmation before treating it as complete.\nStep Three: Meet with Advisor is bypassed for now.\nStep Four: Registration is bypassed for now.\n\n${userText}`;
    }

    return userText;
  };

  const storeLocalAdvisingAnswer = (field, value) => {
    const nextAnswers = {
      ...advisingLocalAnswers,
      [field]: value,
    };
    setAdvisingLocalAnswers(nextAnswers);
    try {
      localStorage.setItem(ADVISING_LOCAL_ANSWERS_STORAGE_KEY, JSON.stringify(nextAnswers));
    } catch (error) {
      console.error("Failed to persist advising answer:", error);
    }
    return nextAnswers;
  };

  const getLatestAdvisorDraft = (messageList = messages) => {
    return [...messageList]
      .reverse()
      .find((message) => {
        if (message.sender !== "bot") return false;
        const cleanText = sanitizeAssistantMessage(message.text);
        if (cleanText.length < 40) return false;
        if (detectBinaryQuestion(message.text)) return false;
        return /advisor|selected courses|student selected|rationale|prerequisite|curricular|draft/i.test(cleanText);
      });
  };

  const handleLocalBinaryAnswer = (questionKey, answerText) => {
    const answerValue = answerText === "Yes" ? "Yes" : "No";
    const askBot = (text) => addMessage(text, "bot");
    const askBinary = (question) => askBot(buildBinaryQuestion(question));

    if (!questionKey || selectedMode !== "advising") return false;

    addMessage(answerText, "user");
    setInput("");
    setIsLoading(false);

    if (questionKey === "ready_step_two") {
      storeLocalAdvisingAnswer("Ready for Step Two", answerValue);
      if (answerValue === "Yes") {
        handleAdvisingStepOneResponse(true);
      } else {
        askBot("No problem. What would you like to update in Step One before we move to the Advising Form?");
      }
      return true;
    }

    if (questionKey === "grad_program_awareness") {
      storeLocalAdvisingAnswer("SCMNS graduate programs awareness", answerValue);
      askBinary("Would you like to conduct research on campus?");
      return true;
    }

    if (questionKey === "campus_research_interest") {
      storeLocalAdvisingAnswer("Campus research interest", answerValue);
      askBinary("Did you present research this academic year?");
      return true;
    }

    if (questionKey === "research_presentations") {
      storeLocalAdvisingAnswer("Research presentations this academic year", answerValue);
      if (answerValue === "Yes") {
        askBot("Please share your research presentation details: presentation type, title, conference name, location, and date. If you had more than one, list each one.");
      } else {
        askBinary("Did you have a publication this academic year?");
      }
      return true;
    }

    if (questionKey === "publications") {
      storeLocalAdvisingAnswer("Publication this academic year", answerValue);
      if (answerValue === "Yes") {
        askBot("Please share the publication title, publication date, and location.");
      } else {
        askBinary("Did you participate in an internship, research, or job experience this academic year?");
      }
      return true;
    }

    if (questionKey === "experience_participation") {
      storeLocalAdvisingAnswer("Internship, research, or job participation", answerValue);
      if (answerValue === "Yes") {
        askBot("Great. Please tell me about the experience: type, role or title, organization, program name if applicable, mentor if research, location or address, and how it supported your education or career goals.");
      } else {
        askBinary("Did you apply for an internship, research, or job experience but were not selected?");
      }
      return true;
    }

    if (questionKey === "experience_applied_not_selected") {
      storeLocalAdvisingAnswer("Applied but not selected for experience", answerValue);
      if (answerValue === "Yes") {
        askBot(`Thanks, I noted that you applied but were not selected.\n\nStep One is almost ready.\n\nPlease rate these Canvas items in one message:\n- Assignments posted in Canvas: Very timely, Timely, Delayed, or Very delayed\n- Assignments graded before midterms: Very timely, Timely, Delayed, or Very delayed`);
      } else {
        askBot("Briefly explain why you did not apply for an internship, research, or job experience this academic year.");
      }
      return true;
    }

    if (questionKey === "second_experience") {
      storeLocalAdvisingAnswer("Second internship, research, or job experience", answerValue);
      if (answerValue === "Yes") {
        askBot("Please share the second experience details: type, role or title, organization, mentor if research, address or location, and how it supported your education or career goals.");
      } else {
        askBot(`Step One is almost ready.\n\nPlease rate these Canvas items in one message:\n- Assignments posted in Canvas: Very timely, Timely, Delayed, or Very delayed\n- Assignments graded before midterms: Very timely, Timely, Delayed, or Very delayed`);
      }
      return true;
    }

    if (questionKey === "has_minor") {
      if (answerValue === "Yes") {
        storeLocalAdvisingAnswer("Has minor", "Yes");
        askBot("What is your minor?");
      } else {
        storeLocalAdvisingAnswer("Minor", "None");
        askBinary("Do you plan to work next semester?");
      }
      return true;
    }

    if (questionKey === "work_next_semester") {
      storeLocalAdvisingAnswer("Plan to work next semester", answerValue);
      askBot("Thanks. What are your career goals, desired credit load, and any course preferences for next semester?");
      return true;
    }

    if (questionKey === "selected_courses_curricular_fit") {
      storeLocalAdvisingAnswer("Selected courses fulfill outstanding curricular components", answerValue);
      if (answerValue === "Yes") {
        askBinary("Do you want to confirm this advising draft for advisor review?");
      } else {
        askBot("Please explain why the non-curricular course should be included, such as graduate school preparation, professional school prerequisites, career alignment, or another reason.");
      }
      return true;
    }

    if (questionKey === "confirm_advising_draft") {
      const nextAnswers = storeLocalAdvisingAnswer("Advisor-ready draft confirmed", answerValue);
      if (answerValue === "Yes") {
        const draftMessage = getLatestAdvisorDraft(messages);
        const advisorDraft = draftMessage ? sanitizeAssistantMessage(draftMessage.text) : "";
        askBot("Great. I have your Step Two advising draft marked as ready for advisor review. I am generating the Academic Advisement PDF now.");
        generateAdvisementPdf({
          localAnswersOverride: nextAnswers,
          advisorDraftOverride: advisorDraft,
          silent: true,
        });
      } else {
        askBot("What would you like to change before I mark the advising draft ready for advisor review?");
      }
      return true;
    }

    return false;
  };

  // Handle binary question button clicks (Yes/No)
  const handleBinaryAnswer = async (messageIndex, answer) => {
    const token = localStorage.getItem("token");
    const answerText = answer === "yes" ? "Yes" : "No";
    const binaryQuestion = detectBinaryQuestion(messages[messageIndex]?.text);
    const questionKey = classifyAdvisingBinaryQuestion(binaryQuestion?.questionText);
    if (handleLocalBinaryAnswer(questionKey, answerText)) return;

    const finalAnswerText = binaryQuestion
      ? `Answer to "${binaryQuestion.questionText}": ${answerText}`
      : answerText;
    const contextualAnswerText = buildAdvisingContextMessage(finalAnswerText);
    
    // Add user's answer as a message
    addMessage(answerText, "user");
    setInput("");
    setIsLoading(true);

    try {
      const curriculumData = loadCurriculumStatus();
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          query: contextualAnswerText,
          session_id: sessionId || "default",
          model: CHAT_MODEL,
          mode: selectedMode,
          curriculum_data: curriculumData
        })
      });

      if (res.status === 401 || res.status === 403) {
        addMessage("Session expired. Please log in again.", "bot");
        setIsLoading(false);
        return;
      }

      if (!res.ok) throw new Error(res.statusText);

      // Process streaming response (similar to handleSend)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      const botMessageId = createMessageId();
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [...prev, { id: botMessageId, text: "", sender: "bot", time, isStreaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "chunk") {
                fullText += event.content;
                setMessages((prev) => updateMessageById(prev, botMessageId, { text: fullText }));
              } else if (event.type === "done") {
                fullText = event.content || fullText;
                setMessages((prev) => updateMessageById(prev, botMessageId, { text: fullText, isStreaming: false }));
              } else if (event.type === "error") {
                const errMsg = event.content || "I hit a temporary issue, but we can keep going. Please answer the next form prompt or type continue.";
                setMessages((prev) => updateMessageById(prev, botMessageId, { text: errMsg, isStreaming: false }));
              }
            } catch (parseErr) {
              console.warn("SSE parse error:", parseErr);
            }
          }
        }
      }

      setMessages((prev) => {
        const target = prev.find((message) => message.id === botMessageId);
        if (!target?.isStreaming) return prev;
        const cleanText = (target.text || "").replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "").trim();
        const fallback = advisingFlowStep === "step2_ready"
          ? "Let's keep going with Step Two. What career goal or target credit load should I use when selecting your next-semester courses?"
          : "Let's keep going with Step One. Please answer the next form prompt, or type continue and I will ask it one at a time.";
        return updateMessageById(prev, botMessageId, {
          text: cleanText || fallback,
          isStreaming: false
        });
      });
    } catch (err) {
      console.error("Binary answer error:", err);
      addMessage("Sorry, there was an error processing your answer.", "bot");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // 🔥 Enhanced TTS using OpenAI API
  const speakWithTTS = async (text) => {
    if (isSpeaking) return;

    setIsSpeaking(true);
    setVoiceStatus("speaking");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text: text.substring(0, 4000), voice: "alloy" })
      });

      if (!response.ok) throw new Error("TTS request failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // 🔥 Use ref to check voice mode (avoids closure issues)
          if (isVoiceModeRef.current) {
            setVoiceStatus("listening");
            setTimeout(() => startListening(), 500);
          } else {
            setVoiceStatus("idle");
          }
        };
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          setVoiceStatus("idle");
          fallbackSpeak(text);
        };
        await audioRef.current.play();
      }
    } catch (error) {
      console.error("TTS Error:", error);
      fallbackSpeak(text);
    }
  };

  // Browser TTS fallback
  const fallbackSpeak = (text) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      setVoiceStatus("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.onend = () => {
      setIsSpeaking(false);
      // 🔥 Use ref to check voice mode (avoids closure issues)
      if (isVoiceModeRef.current) {
        setVoiceStatus("listening");
        setTimeout(() => startListening(), 500);
      } else {
        setVoiceStatus("idle");
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  // Simple TTS for manual speaker button (uses browser TTS)
  // Click once to play, click again to stop
  const speak = (text) => {
    if (!window.speechSynthesis) return toast.warning("Text-to-speech not supported in this browser.");
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.pause();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const openInternshipForm = () => {
    window.open(ADVISING_STEP_ONE_URL, "_blank", "noopener,noreferrer");
  };

  const handleAdvisingStepOneResponse = (completedStepOne) => {
    const courses = loadCompletedCourses();
    const inProgress = loadInProgressCourses();
    setCompletedCourses(courses);
    setInProgressCourses(inProgress);

    if (!completedStepOne) {
      setAdvisingFlowStep("step1_ready");
      setAdvisingLocalAnswers({});
      const completedProfileSummary = completedProfileStepOneFields.length > 0
        ? ` I already pulled these from your profile: ${formatFieldList(completedProfileStepOneFields)}.`
        : "";
      addMessage(`Let's complete Step One together: ${ADVISING_STEP_ONE_TITLE}.${completedProfileSummary} I will keep it short and only ask for what is still needed: ${formatFieldList(remainingStepOneFields)}. Conditional research, publication, and experience details will only come up if your answers make them relevant. Are you ready to begin?`, "bot");
      return;
    }

    setAdvisingFlowStep("step2_ready");
    const courseSummary = courses.length > 0 ? courses.join(", ") : "none recorded yet";
    const inProgressSummary = inProgress.length > 0 ? inProgress.join(", ") : "none recorded yet";
    const completedProfileSummary = completedProfileAdvisingFields.length > 0
      ? ` I already have these from your profile: ${formatFieldList(completedProfileAdvisingFields)}.`
      : "";
    addMessage(`Great. Step One is complete, so we can begin Step Two: the Academic Advisement Form. I see these completed curriculum courses: ${courseSummary}. I also see these courses currently being pursued: ${inProgressSummary}. In-progress courses will count for prerequisite planning while you are currently taking them.${completedProfileSummary} I will only ask for the remaining advisor-form details: ${formatFieldList(remainingAdvisingStudentFields)}. Then I will help select next-semester courses that fit your curriculum, prerequisites, graduation timing, and career goals.`, "bot");
  };

  // Handle File Selection (Staging)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error("Unsupported file type.");
        return;
      }
      setPendingFile(file);
    }
    // Reset value so onChange triggers again if same file selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Clear Staged File
  const clearFile = () => {
    setPendingFile(null);
  };

  // 🔥 Enhanced Voice Input with Voice Mode Support - CONTINUOUS
  const startListening = (forceVoiceMode = false) => {
    // Don't start if already listening or speaking
    if (isListening || isSpeaking) return;

    // Extra safety check - if not in voice mode and not forced, don't start
    if (!forceVoiceMode && !isVoiceModeRef.current) return;

    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) {
      toast.warning("Speech recognition not supported. Try Chrome or Edge.");
      return;
    }

    const rec = new SpeechAPI();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;

    // Track if we got a result (to handle silence timeouts)
    let gotResult = false;

    rec.onstart = () => {
      setIsListening(true);
      setVoiceStatus("listening");
      console.log("🎤 Voice mode: Started listening...");
    };

    rec.onresult = async (e) => {
      gotResult = true;
      const transcript = e.results[0][0].transcript;
      console.log("🎤 Voice mode: Got transcript:", transcript);
      setInput(transcript);
      setIsListening(false);

      // 🔥 Check ref for current voice mode state (not stale closure)
      if (isVoiceModeRef.current) {
        setVoiceStatus("processing");
        await handleVoiceSend(transcript);
      }
    };

    rec.onerror = (e) => {
      console.error("🎤 Speech error:", e.error);
      setIsListening(false);

      // 🔥 FIXED: For certain errors, retry listening if still in voice mode
      if (isVoiceModeRef.current) {
        // "no-speech" means user was silent - just restart listening
        // "aborted" means we stopped it intentionally - don't restart
        // "network" - network issue, try again
        if (e.error === "no-speech" || e.error === "network") {
          console.log("🎤 Voice mode: Restarting after", e.error);
          setVoiceStatus("listening");
          setTimeout(() => startListening(), 300);
        } else if (e.error !== "aborted") {
          // Other errors - still try to restart after a delay
          setVoiceStatus("listening");
          setTimeout(() => startListening(), 1000);
        }
      } else {
        setVoiceStatus("idle");
      }
    };

    rec.onend = () => {
      console.log("🎤 Voice mode: Recognition ended, gotResult:", gotResult);
      setIsListening(false);

      // 🔥 FIXED: If voice mode is active and we didn't get a result, restart
      // This handles the case where recognition ends without triggering onresult or onerror
      if (isVoiceModeRef.current && !gotResult && !isSpeaking) {
        console.log("🎤 Voice mode: Restarting (no result received)");
        setVoiceStatus("listening");
        setTimeout(() => startListening(), 300);
      }
    };

    rec.start();
  };

  // Voice mode send handler - sends and speaks response
  const handleVoiceSend = async (transcript) => {
    if (!transcript.trim()) {
      // Empty transcript - restart listening if in voice mode
      if (isVoiceModeRef.current) {
        setVoiceStatus("listening");
        setTimeout(() => startListening(), 300);
      }
      return;
    }

    const token = localStorage.getItem("token");
    addMessage(transcript, "user");
    setInput("");

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          query: transcript,
          session_id: sessionId || "default",
            model: CHAT_MODEL,
            mode: selectedMode
        })
      });

      if (!res.ok) throw new Error(res.statusText);

      const data = await res.json();
      const botResponse = data.response || data.message || "No response.";

      const isOutage = botResponse.includes("temporarily") && botResponse.includes("knowledge base");
      if (isOutage) {
        toast("Warming up! Try your question again.", {
          duration: 6000,
          style: {
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#f1f5f9",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "14px",
            padding: "14px 18px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.1)",
            backdropFilter: "blur(12px)",
            fontSize: "0.88rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
          },
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="url(#tg2)" strokeWidth="2" strokeLinecap="round"/><path d="M12 7v5l3 3" stroke="url(#tg2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="tg2" x1="3" y1="3" x2="21" y2="21"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>,
        });
      } else {
        addMessage(botResponse, "bot");
        await speakWithTTS(botResponse);
      }

    } catch (err) {
      console.error("🎤 Voice send error:", err);
      addMessage("Sorry, I had trouble processing that. Please try again.", "bot");

      // 🔥 FIXED: Restart listening even on error if still in voice mode
      if (isVoiceModeRef.current) {
        setVoiceStatus("listening");
        setTimeout(() => startListening(), 1000);
      } else {
        setVoiceStatus("idle");
      }
    }
  };

  // Toggle voice mode on/off
  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      // Stop voice mode
      setIsVoiceMode(false);
      isVoiceModeRef.current = false; // 🔥 Sync ref with state
      setVoiceStatus("idle");
      setIsListening(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    } else {
      // Start voice mode
      setIsVoiceMode(true);
      isVoiceModeRef.current = true; // 🔥 Sync ref with state
      startListening(true); // 🔥 Pass true to force voice mode for first listen
    }
  };

  // Simple voice input (tap mic without entering voice mode) - FIXED
  const handleVoiceInput = () => {
    // If already listening, stop it
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) {
      toast.warning("Speech recognition not supported. Try Chrome or Edge.");
      return;
    }

    const rec = new SpeechAPI();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;

    rec.onstart = () => {
      setIsListening(true);
      console.log("🎤 Simple mic: Started listening...");
    };

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      console.log("🎤 Simple mic: Got transcript:", transcript);
      setInput(transcript);
      setIsListening(false);
      // Auto-focus input so user can edit or send
      inputRef.current?.focus();
    };

    rec.onerror = (e) => {
      console.error("🎤 Simple mic error:", e.error);
      setIsListening(false);
      if (e.error === "no-speech") {
        // User was silent, just stop quietly
      } else if (e.error !== "aborted") {
        toast.error("Voice input error: " + e.error);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.start();
  };

  const handleSuggestion = (text) => {
      if (!isLoading) {
          setInput(text);
          // Auto-send the suggestion instead of just filling the input
          setTimeout(() => {
              const form = document.querySelector('.chat-input-wrapper');
              if (form) form.requestSubmit();
          }, 50);
      }
  };

  // 🔥 FEEDBACK HANDLERS
  const handleFeedback = async (messageIndex, feedbackType, messageText) => {
    const token = localStorage.getItem("token");

    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message_text: messageText,
          feedback_type: feedbackType, // 'helpful', 'not_helpful', 'report'
          report_details: feedbackType === 'report' ? reportText : null,
          session_id: sessionId || "default"
        })
      });

      // Update local state to show feedback was given
      setFeedbackGiven(prev => ({ ...prev, [messageIndex]: feedbackType }));
      setFeedbackMenuOpen(null);

      if (feedbackType === 'report') {
        setReportModal(null);
        setReportText("");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const openReportModal = (messageIndex) => {
    setReportModal(messageIndex);
    setFeedbackMenuOpen(null);
  };

  const closeReportModal = () => {
    setReportModal(null);
    setReportText("");
  };

  // Close feedback menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (feedbackMenuOpen !== null && !e.target.closest('.feedback-menu-container')) {
        setFeedbackMenuOpen(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [feedbackMenuOpen]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }, []);

  // 🔥 MAIN SEND LOGIC - With Streaming Support
  const handleSend = async (e, overrideText = null, skipCache = false) => {
    if (e) e.preventDefault();
    const sendText = overrideText || input.trim();
    if ((!sendText && !pendingFile) || isLoading) return;

    // Handle Step One keyword detection in advising mode
    if (selectedMode === "advising" && advisingFlowStep === "step1_check") {
      const lowerText = sendText.toLowerCase();
      const completionKeywords = ["yes", "complete", "completed", "finished", "done", "have", "i have"];
      const nonCompletionKeywords = ["no", "haven't", "have not", "not completed", "need help", "don't have", "do not have"];
      
      const hasCompletion = completionKeywords.some(kw => lowerText.includes(kw));
      const hasNonCompletion = nonCompletionKeywords.some(kw => lowerText.includes(kw));
      
      if (hasCompletion && !hasNonCompletion) {
        // User says they completed Step One
        addMessage(sendText, "user");
        setInput("");
        handleAdvisingStepOneResponse(true);
        return;
      } else if (hasNonCompletion || !hasCompletion) {
        // User says they haven't completed it, or unclear response
        addMessage(sendText, "user");
        setInput("");
        handleAdvisingStepOneResponse(false);
        return;
      }
    }

    setIsLoading(true);
    setInput("");  // Clear input immediately to prevent concatenation with next typed message
    let finalMessage = sendText;
    let displayMessage = getVisibleUserMessage(sendText); // Keep hidden context out of the UI
    let activeBotMessageId = null;

    finalMessage = buildAdvisingContextMessage(finalMessage);

    try {
        const token = localStorage.getItem("token");

        // 1. Upload File (if exists, only for non-override sends)
        if (pendingFile && !overrideText) {
            const formData = new FormData();
            formData.append("file", pendingFile);

            const uploadRes = await fetch(`${API_BASE}/api/upload-file`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (uploadRes.ok) {
                const data = await uploadRes.json();
                const fullUrl = data.url.startsWith("http") ? data.url : `${API_BASE}${data.url}`;

                const fileMarkdown = `[${data.filename}](${fullUrl})`;

                if (finalMessage) {
                    finalMessage = `${fileMarkdown}\n${finalMessage}`;
                }
                if (displayMessage) {
                    displayMessage = `${fileMarkdown}\n${displayMessage}`;
                } else {
                    displayMessage = fileMarkdown;
                }
            } else {
                toast.error("File upload failed. Sending text only.");
            }
        }

        // 2. Optimistic UI Update
        addMessage(displayMessage, "user");
        if (!overrideText) {
            setInput("");
            setPendingFile(null);
            // Reset textarea height
            if (inputRef.current) inputRef.current.style.height = 'auto';
        }

        // 3. Add placeholder bot message for streaming
        const botMessageId = createMessageId();
        activeBotMessageId = botMessageId;
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setThinkingStepIndex(0);
        setMessages((prev) => [...prev, { id: botMessageId, text: "", sender: "bot", time, isStreaming: true }]);

        // 4. Stream from Chat API using fetch with ReadableStream
        const res = await fetch(`${API_BASE}/chat/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                query: finalMessage,
                session_id: sessionId || "default",
                skip_cache: skipCache,
              model: CHAT_MODEL,
              mode: selectedMode
            }),
        });

        if (res.status === 401 || res.status === 403) {
            setMessages((prev) => updateMessageById(prev, botMessageId, {
                text: "Session expired. Please log in again.",
                isStreaming: false
            }));
            setIsLoading(false);
            return;
        }

        if (!res.ok) throw new Error(res.statusText);

        // 5. Read SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const event = JSON.parse(line.slice(6));

                        if (event.type === "status") {
                            // Real-time status from ADK tool calls - advance step
                            setThinkingStepIndex(prev => Math.min(prev + 1, thinkingMessages.length - 1));
                        } else if (event.type === "chunk") {
                            fullText += event.content;
                            // Update the streaming message
                            setMessages((prev) => updateMessageById(prev, botMessageId, { text: fullText }));
                        } else if (event.type === "done") {
                            // Finalize the message
                            fullText = event.content || fullText;
                            setMessages((prev) => updateMessageById(prev, botMessageId, { text: fullText, isStreaming: false }));
                        } else if (event.type === "error") {
                            const errMsg = event.content || "An error occurred.";
                            const isOutage = errMsg.includes("temporarily") || errMsg.includes("knowledge base") || errMsg.includes("system issue");

                            if (isOutage) {
                                // Silent retry once before showing toast (ADK cold-connect)
                                if (!skipCache && !window._lastRetried) {
                                    window._lastRetried = true;
                                    setMessages((prev) => removeMessageById(prev, botMessageId)); // remove placeholder
                                    setIsLoading(false);
                                    setTimeout(() => {
                                        handleSend(null, finalMessage, false);
                                        setTimeout(() => { window._lastRetried = false; }, 10000);
                                    }, 2000);
                                    return;
                                }
                                window._lastRetried = false;
                                toast("Warming up! Try your question again.", {
                                    duration: 6000,
                                    style: {
                                      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                                      color: "#f1f5f9",
                                      border: "1px solid rgba(99, 102, 241, 0.3)",
                                      borderRadius: "14px",
                                      padding: "14px 18px",
                                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.1)",
                                      backdropFilter: "blur(12px)",
                                      fontSize: "0.88rem",
                                      fontWeight: 500,
                                      letterSpacing: "0.01em",
                                    },
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="url(#tg)" strokeWidth="2" strokeLinecap="round"/><path d="M12 7v5l3 3" stroke="url(#tg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="tg" x1="3" y1="3" x2="21" y2="21"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>,
                                });
                                // Remove the placeholder bot message
                                setMessages((prev) => removeMessageById(prev, botMessageId));
                            } else {
                                setMessages((prev) => updateMessageById(prev, botMessageId, { text: errMsg, isStreaming: false }));
                            }
                        }
                    } catch (parseErr) {
                        console.warn("SSE parse error:", parseErr);
                    }
                }
            }
        }

        // Finalize if stream ended without explicit done
        setMessages((prev) => {
            const target = prev.find((message) => message.id === botMessageId);
            if (!target?.isStreaming) return prev;
            const cleanText = (target.text || "").replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "").trim();
            return updateMessageById(prev, botMessageId, {
                text: cleanText || "I'm sorry, I couldn't generate a response. Please try rephrasing your question.",
                isStreaming: false
            });
        });

    } catch (err) {
        console.error("Send error:", err);
        const isNetworkDown = err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError") || err.message?.includes("network");

        if (isNetworkDown) {
            // Silent retry once before showing toast (backend cold-connect)
            if (!window._lastRetried) {
                window._lastRetried = true;
                if (activeBotMessageId) {
                    setMessages((prev) => removeMessageById(prev, activeBotMessageId));
                }
                setIsLoading(false);
                setTimeout(() => {
                    handleSend(null, finalMessage, false);
                    setTimeout(() => { window._lastRetried = false; }, 10000);
                }, 2000);
                return;
            }
            window._lastRetried = false;
            toast("Warming up! Try your question again.", {
                duration: 6000,
                style: {
                    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                    color: "#f1f5f9",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: "14px",
                    padding: "14px 18px",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.1)",
                    backdropFilter: "blur(12px)",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                },
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 11-6.22-8.56" stroke="url(#dg)" strokeWidth="2" strokeLinecap="round"/><path d="M21 3v5h-5" stroke="url(#dg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="dg" x1="3" y1="3" x2="21" y2="21"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>,
            });
            // Remove the placeholder bot message
            if (activeBotMessageId) {
                setMessages((prev) => removeMessageById(prev, activeBotMessageId));
            }
        } else {
            if (activeBotMessageId) {
                setMessages((prev) => updateMessageById(prev, activeBotMessageId, {
                    text: "Something went wrong. Please try again.",
                    isStreaming: false
                }));
            } else {
                addMessage("Something went wrong. Please try again.", "bot");
            }
        }
    } finally {
        setIsLoading(false);
        // Regain focus
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.sender === "user");
    if (!lastUserMsg) return;
    const regenerateText = getVisibleUserMessage(lastUserMsg.text);
    if (!regenerateText) return;
    // Remove last bot message
    setMessages(prev => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].sender === "bot") {
        copy.pop();
      }
      return copy;
    });
    setTimeout(() => handleSend(null, regenerateText, true), 50);
  };

  const generateAdvisementPdf = async ({
    localAnswersOverride = null,
    advisorDraftOverride = null,
    silent = false,
  } = {}) => {
    if (isGeneratingAdvisementPdf) return;
    setIsGeneratingAdvisementPdf(true);
    try {
      const token = localStorage.getItem("token");
      const localAnswersPayload = localAnswersOverride || advisingLocalAnswers;
      const latestBotDraft = advisorDraftOverride ? null : getLatestAdvisorDraft(messages);
      const advisorDraft = advisorDraftOverride || (latestBotDraft ? sanitizeAssistantMessage(latestBotDraft.text) : "");
      const selectedCourseText = [
        advisorDraft,
        localAnswersPayload["Student selected courses"],
        localAnswersPayload["Selected courses"],
      ].filter(Boolean).join("\n");
      const selectedCourses = Array.from(new Set((selectedCourseText.match(/\b[A-Z]{2,4}\s?\d{3}\b/g) || []).map((code) => code.replace(/\s+/, " ").trim().toUpperCase())));
      const pdfKey = JSON.stringify({
        studentId: firstProfileValue(userProfile?.studentId, degreeWorksProfile?.student_id),
        selectedCourses,
        confirmed: localAnswersPayload["Advisor-ready draft confirmed"],
        draft: advisorDraft.slice(0, 300),
      });

      if (pdfKey === lastGeneratedAdvisementPdfKeyRef.current) {
        return;
      }

      const profilePayload = {
        name: firstProfileValue(userProfile?.name, degreeWorksProfile?.student_name),
        firstName: splitProfileName(userProfile, degreeWorksProfile).firstName,
        lastName: splitProfileName(userProfile, degreeWorksProfile).lastName,
        studentId: firstProfileValue(userProfile?.studentId, degreeWorksProfile?.student_id),
        major: firstProfileValue(userProfile?.major, degreeWorksProfile?.degree_program),
        email: userProfile?.email,
        classification: degreeWorksProfile?.classification,
        credits: degreeWorksProfile?.total_credits_earned,
        advisor: degreeWorksProfile?.advisor,
        gpa: degreeWorksProfile?.overall_gpa,
        graduationDate: localAnswersPayload["Graduation Date"],
      };

      const response = await fetch(`${API_BASE}/api/advising/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile: profilePayload,
          local_answers: localAnswersPayload,
          completed_courses: completedCourses,
          in_progress_courses: inProgressCourses,
          selected_courses: selectedCourses,
          advisor_draft: advisorDraft,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not generate advisement PDF.");
      }

      const fullUrl = data.url?.startsWith("http") ? data.url : `${API_BASE}${data.url}`;
      lastGeneratedAdvisementPdfKeyRef.current = pdfKey;
      addMessage(`Your Academic Advisement PDF is ready: [${data.filename || "Academic Advisement Form.pdf"}](${fullUrl})`, "bot");
      if (!silent) {
        toast.success("Academic Advisement PDF generated.");
      }
    } catch (error) {
      console.error("Advisement PDF generation failed:", error);
      toast.error(error.message || "Could not generate the advisement PDF.");
    } finally {
      setIsGeneratingAdvisementPdf(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setPendingFile(e.dataTransfer.files[0]);
    }
  };

  // Message animation variants
  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] } },
  };

  // Code block renderer for ReactMarkdown
  const codeRenderer = ({ node, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    const isBlock = match || codeString.includes('\n');

    if (isBlock) {
      const language = match ? match[1] : 'text';
      return (
        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span className="code-lang">{language}</span>
            <button
              className="code-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(codeString);
                toast.success("Copied to clipboard");
              }}
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '0.85rem' }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }
    return <code className={className} {...props}>{children}</code>;
  };

  const welcomeTitle = selectedMode === "advising" ? "Advising Mode" : "Morgan State CS Navigator";
  const welcomeSubtitle = selectedMode === "advising"
    ? "How can I help advise you?"
    : "How can I assist with your academic journey today?";
  const showWelcomeSuggestions = selectedMode !== "advising" || advisingFlowStep === "step2_ready";
  const latestBinaryQuestionIndex = selectedMode === "advising"
    ? messages.reduce((latestIndex, message, index) => (
        message.sender === "bot" && !message.isStreaming && detectBinaryQuestion(message.text)
          ? index
          : latestIndex
      ), -1)
    : -1;

  return (
    <div
      className={`chat-main ${isDragging ? 'drag-active' : ''} ${selectedMode === 'advising' ? 'mode-advising' : 'mode-general'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Mode selector */}
      <div className="mode-selector-header">
        <div className="mode-selector-row" role="tablist" aria-label="Chat modes">
          {CHAT_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={selectedMode === mode.id}
              className={`mode-tab ${selectedMode === mode.id ? "active" : ""}`}
              onClick={() => {
                setSelectedMode(mode.id);
                onModeChange?.(mode.id);
              }}
              disabled={isLoading}
            >
              <span className="mode-tab-name">{mode.name}</span>
              <span className="mode-tab-desc">{mode.desc}</span>
            </button>
          ))}
        </div>
        <div className="mode-selector-state">
          {selectedMode === "advising" ? "Advising Mode active" : "General chat active"}
        </div>
      </div>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Drag overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <FaPaperclip size={32} />
            <span>Drop file here</span>
          </div>
        </div>
      )}

      <div className="chat-messages">
        <AnimatePresence initial={false}>
        {messages.length === 0 ? (
          <motion.div
            className="welcome-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <img src="/msu_logo.webp" alt="MSU Logo" className="welcome-logo" />
            <h1 className="welcome-title">{welcomeTitle}</h1>
            <p className="welcome-subtitle">{welcomeSubtitle}</p>
            {selectedMode === "advising" && (
              <div className="advising-flow-card">
                {advisingFlowStep === "step1_check" && (
                  <>
                    <p className="advising-flow-label">Step One</p>
                    <p className="advising-flow-question">{ADVISING_STEP_ONE_TITLE}</p>
                    <p className="advising-flow-helper">I can help you fill the form faster by using saved profile details and only asking for what is missing.</p>
                    {stepOneKnownFacts.length > 0 && (
                      <>
                        <p className="advising-flow-helper">Already pulled from your profile:</p>
                        <div className="advising-field-pill-group">
                          {stepOneKnownFacts.map((fact) => (
                            <span key={fact.field} className="advising-field-pill known">
                              {fact.field}: {fact.value}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    <p className="advising-flow-helper">Still needed to start Step One:</p>
                    <div className="advising-field-pill-group">
                      {remainingStepOneFields.length > 0 ? (
                        remainingStepOneFields.map((field) => (
                          <span key={field} className="advising-field-pill">{field}</span>
                        ))
                      ) : (
                        <span className="advising-field-pill">Nothing else from your profile section</span>
                      )}
                    </div>
                    <div className="advising-flow-actions">
                      <button type="button" className="suggestion-btn" onClick={() => handleAdvisingStepOneResponse(false)}>
                        Start Step One
                      </button>
                      <button type="button" className="suggestion-btn" onClick={() => handleAdvisingStepOneResponse(true)}>
                        I already completed it
                      </button>
                    </div>
                  </>
                )}

                {advisingFlowStep === "step1_ready" && (
                  <>
                    <p className="advising-flow-label">Step One</p>
                    <p className="advising-flow-question">We are drafting your Internship, Research, Job Experience Form.</p>
                    <p className="advising-flow-helper">Answer the remaining prompts in chat. I will skip profile fields and only open conditional sections when needed.</p>
                    {stepOneKnownFacts.length > 0 && (
                      <>
                        <p className="advising-flow-helper">Already pulled from your profile:</p>
                        <div className="advising-field-pill-group">
                          {stepOneKnownFacts.map((fact) => (
                            <span key={fact.field} className="advising-field-pill known">
                              {fact.field}: {fact.value}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="advising-flow-actions">
                      <a className="advising-link-btn" href={ADVISING_STEP_ONE_URL} target="_blank" rel="noopener noreferrer">
                        Open Original Form
                      </a>
                      <button type="button" className="suggestion-btn" onClick={() => handleAdvisingStepOneResponse(true)}>
                        Continue to Step Two
                      </button>
                    </div>
                  </>
                )}

                {advisingFlowStep === "step2_ready" && (
                  <>
                    <p className="advising-flow-label">Step Two</p>
                    <p>We will build your Academic Advisement Form and select next-semester courses for advisor review.</p>
                    <p className="advising-flow-helper">I will use your completed and in-progress curriculum, then match course options to your goals, career interests, prerequisites, and graduation timeline.</p>
                    {advisingKnownFacts.length > 0 && (
                      <>
                        <p className="advising-flow-helper">Already pulled from your profile:</p>
                        <div className="advising-field-pill-group">
                          {advisingKnownFacts.map((fact) => (
                            <span key={fact.field} className="advising-field-pill known">
                              {fact.field}: {fact.value}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    <p className="advising-flow-helper">Still needed for the advisor form:</p>
                    <div className="advising-field-pill-group">
                      {remainingAdvisingStudentFields.length > 0 ? (
                        remainingAdvisingStudentFields.map((field) => (
                          <span key={field} className="advising-field-pill">{field}</span>
                        ))
                      ) : (
                        <span className="advising-field-pill">Nothing else from your profile section</span>
                      )}
                    </div>
                    {completedCourses.length > 0 && (
                      <>
                        <p className="advising-flow-helper">Completed courses:</p>
                      <div className="completed-course-list">
                        {completedCourses.map((courseCode) => (
                          <span key={courseCode} className="completed-course-pill">{courseCode}</span>
                        ))}
                      </div>
                      </>
                    )}
                    {inProgressCourses.length > 0 && (
                      <>
                        <p className="advising-flow-helper">In-progress courses, counted for prerequisite planning:</p>
                        <div className="completed-course-list">
                          {inProgressCourses.map((courseCode) => (
                            <span key={courseCode} className="completed-course-pill in-progress">{courseCode}</span>
                          ))}
                        </div>
                      </>
                    )}
                    <p>Steps Three and Four are bypassed for now.</p>
                    <div className="advising-flow-actions">
                      <button
                        type="button"
                        className="suggestion-btn"
                        onClick={generateAdvisementPdf}
                        disabled={isGeneratingAdvisementPdf}
                      >
                        {isGeneratingAdvisementPdf ? "Generating PDF..." : "Generate Advisement PDF"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="suggestions">
              {showWelcomeSuggestions && suggestionsLoading ? (
                <>
                  <div className="suggestion-skeleton"></div>
                  <div className="suggestion-skeleton"></div>
                  <div className="suggestion-skeleton"></div>
                </>
              ) : showWelcomeSuggestions ? (
                suggestions.map((s, i) => (
                  <button key={i} className="suggestion-btn" onClick={() => handleSuggestion(s)} disabled={isLoading}>
                    {s}
                  </button>
                ))
              ) : null}
            </div>
          </motion.div>
        ) : (
          messages.map((msg, i) => {
            const displayText = sanitizeAssistantMessage(msg.text);
            return (
            <motion.div
              key={msg.id || i}
              className={`message ${msg.sender}`}
              variants={messageVariants}
              initial="hidden"
              animate="visible"
            >
              <img
                src={msg.sender === "user" ? userProfilePicture : "/bot_avatar.webp"}
                alt={msg.sender}
                className="avatar-img"
                onError={(e) => { if (msg.sender === "user") e.target.src = "/user_icon.webp"; }}
              />
              <div className="message-content">
                <div className="message-bubble-wrapper">
                  <div className="message-bubble">

                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                          code: codeRenderer,
                          a: ({node, href, children, ...props}) => {
                              const isFile = href && (href.includes("uploads/chat_files") || href.includes("uploads/profile_pictures"));

                              if (isFile) {
                                  return (
                                      <a href={href} target="_blank" rel="noopener noreferrer" className="file-card">
                                          <div className="file-icon-wrapper">
                                              {getFileIcon(children[0])}
                                          </div>
                                          <div className="file-info">
                                              <span className="file-name">{children}</span>
                                              <span className="file-action">Click to view file</span>
                                          </div>
                                      </a>
                                  );
                              }
                              return <a href={href} target="_blank" rel="noopener noreferrer" className="message-link" {...props}>{children}</a>;
                          }
                      }}
                    >
                      {displayText}
                    </ReactMarkdown>

                    {/* Streaming indicator - show steps when no text, cursor when text is streaming */}
                    {msg.isStreaming && !msg.text && (
                      <div className="stream-status-container">
                        {thinkingMessages.slice(0, thinkingStepIndex).map((step, si) => (
                          <div key={si} className="stream-step completed">
                            <div className="step-icon-wrap done">
                              <svg className="step-check" viewBox="0 0 16 16" fill="none"><path d="M4 8.5l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <span>{step}</span>
                          </div>
                        ))}
                        <div className="stream-step active">
                          <div className="step-icon-wrap active-icon">
                            {getStatusIcon(thinkingMessages[thinkingStepIndex])}
                          </div>
                          <span className="thinking-text-shimmer">{thinkingMessages[thinkingStepIndex]}</span>
                        </div>
                      </div>
                    )}
                    {msg.isStreaming && msg.text && (
                      <span className="streaming-cursor" aria-hidden="true">
                        <span className="cursor-bar"></span>
                      </span>
                    )}

                    {/* 🔥 Binary Yes/No Question Buttons */}
                    {msg.sender === "bot" && !msg.isStreaming && selectedMode === "advising" && i === latestBinaryQuestionIndex && (() => {
                      const binaryQ = detectBinaryQuestion(msg.text);
                      return binaryQ ? (
                        <div className="binary-question-buttons">
                          <button 
                            className="binary-btn binary-btn-yes"
                            onClick={() => handleBinaryAnswer(i, "yes")}
                            disabled={isLoading}
                          >
                            Yes
                          </button>
                          <button 
                            className="binary-btn binary-btn-no"
                            onClick={() => handleBinaryAnswer(i, "no")}
                            disabled={isLoading}
                          >
                            No
                          </button>
                        </div>
                      ) : null;
                    })()}

                    {msg.sender === "bot" && !msg.isStreaming && (
                      <div className="bot-action-row">
                        <button
                          className={`tts-btn${isSpeaking ? ' tts-active' : ''}`}
                          onClick={() => speak(displayText)}
                          title={isSpeaking ? "Stop speaking" : "Read response aloud"}
                        >
                          {isSpeaking ? <FaStop size={14}/> : <FaVolumeUp size={14}/>}
                        </button>
                        {i === messages.length - 1 && !isLoading && (
                          <button
                            className="regen-icon-btn"
                            onClick={handleRegenerate}
                            title="Regenerate response"
                          >
                            <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M13.5 8a5.5 5.5 0 11-1.3-3.56" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M13.5 2.5v2.5H11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 🔥 FEEDBACK MENU - Right side of bot messages */}
                  {msg.sender === "bot" && (
                    <div className="feedback-menu-container">
                      {/* Show feedback status if already given */}
                      {feedbackGiven[i] ? (
                        <div className={`feedback-status feedback-status--${feedbackGiven[i]}`}>
                          {feedbackGiven[i] === 'helpful' && <FaThumbsUp size={12} />}
                          {feedbackGiven[i] === 'not_helpful' && <FaThumbsDown size={12} />}
                          {feedbackGiven[i] === 'report' && <FaFlag size={12} />}
                        </div>
                      ) : (
                        <>
                          {/* Three-dot menu button - visible on hover */}
                          <button
                            className="feedback-menu-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFeedbackMenuOpen(feedbackMenuOpen === i ? null : i);
                            }}
                            title="Rate this response"
                          >
                            <FaEllipsisV size={14} />
                          </button>

                          {/* Dropdown menu */}
                          {feedbackMenuOpen === i && (
                            <div className="feedback-dropdown">
                              <button
                                className="feedback-option feedback-option--helpful"
                              onClick={() => handleFeedback(i, 'helpful', displayText)}
                              >
                                <FaThumbsUp size={14} />
                                <span>Helpful</span>
                              </button>
                              <button
                                className="feedback-option feedback-option--not-helpful"
                              onClick={() => handleFeedback(i, 'not_helpful', displayText)}
                              >
                                <FaThumbsDown size={14} />
                                <span>Not Helpful</span>
                              </button>
                              <button
                                className="feedback-option feedback-option--report"
                                onClick={() => openReportModal(i)}
                              >
                                <FaFlag size={14} />
                                <span>Report Issue</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="timestamp">{msg.time}</div>
              </div>
            </motion.div>
          )})
        )}
        </AnimatePresence>

        {/* Old regenerate button removed - now inline with bot message actions */}

        {/* Thinking Indicator - shown before streaming starts */}
        {isLoading && !messages.some(m => m.isStreaming) && (
          <div className="message bot">
            <img src="/bot_avatar.webp" alt="Bot" className="avatar-img" />
            <div className="message-content">
              <div className="message-bubble thinking-bubble">
                <div className="stream-status-container">
                  {thinkingMessages.slice(0, thinkingStepIndex).map((step, si) => (
                    <div key={si} className="stream-step completed">
                      <div className="step-icon-wrap done">
                        <svg className="step-check" viewBox="0 0 16 16" fill="none"><path d="M4 8.5l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                  <div className="stream-step active">
                    <div className="step-icon-wrap active-icon">
                      {getStatusIcon(thinkingMessages[thinkingStepIndex])}
                    </div>
                    <span className="thinking-text-shimmer">{thinkingMessages[thinkingStepIndex]}</span>
                    <span className="thinking-timer">{thinkingTimer}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* 🔥 Voice Mode Overlay - Seamless ChatGPT-style */}
        {isVoiceMode && (
          <div className="voice-overlay">
            <div className="voice-orb-container">
              <div className={`voice-orb ${voiceStatus}`}>
                <div className="orb-ring ring-1"></div>
                <div className="orb-ring ring-2"></div>
                <div className="orb-ring ring-3"></div>
                <div className="orb-core">
                  {voiceStatus === "listening" && <FaMicrophone size={32} />}
                  {voiceStatus === "processing" && <div className="orb-spinner" />}
                  {voiceStatus === "speaking" && <FaVolumeUp size={32} />}
                  {voiceStatus === "idle" && <FaMicrophone size={32} />}
                </div>
              </div>
              <p className="voice-label">
                {voiceStatus === "listening" && "Listening..."}
                {voiceStatus === "processing" && "Thinking..."}
                {voiceStatus === "speaking" && "Speaking..."}
                {voiceStatus === "idle" && "Ready"}
              </p>
              <button className="voice-end-btn" onClick={toggleVoiceMode}>
                End
              </button>
            </div>
          </div>
        )}

        {/* 🔥 REPORT MODAL */}
        {reportModal !== null && (
          <div className="report-modal-overlay" onClick={closeReportModal}>
            <div className="report-modal" onClick={(e) => e.stopPropagation()}>
              <div className="report-modal-header">
                <h3>Report an Issue</h3>
                <button className="report-modal-close" onClick={closeReportModal}>
                  <FaTimes size={16} />
                </button>
              </div>
              <div className="report-modal-body">
                <p>Help us improve! What was wrong with this response?</p>
                <textarea
                  className="report-textarea"
                  placeholder="Describe the issue (e.g., incorrect information, unhelpful response, inappropriate content...)"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="report-modal-footer">
                <button className="report-cancel-btn" onClick={closeReportModal}>
                  Cancel
                </button>
                <button
                  className="report-submit-btn"
                  onClick={() => handleFeedback(reportModal, 'report', sanitizeAssistantMessage(messages[reportModal]?.text))}
                  disabled={!reportText.trim()}
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`chat-input-container ${selectedMode === 'advising' ? 'mode-advising' : 'mode-general'}`}>

        <form onSubmit={handleSend} className="chat-input-wrapper">

          {/* 🔥 STAGING AREA: Shows file before sending */}
          {pendingFile && (
            <div className="attachment-preview">
              {getFileIcon(pendingFile.name)}
              <span className="file-name-preview">{pendingFile.name}</span>
              <button
                type="button"
                className="remove-attachment-btn"
                onClick={clearFile}
                title="Remove file"
              >
                <FaTimes />
              </button>
            </div>
          )}

          <div className="input-row">
            <button
                type="button"
                className="action-btn-icon"
                onClick={() => fileInputRef.current.click()}
                title="Attach a file"
                disabled={isLoading || isVoiceMode}
            >
                <FaPaperclip size={18} />
            </button>

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.doc,.docx"
                onChange={handleFileSelect}
            />

            <button
                type="button"
                className={`action-btn-icon voice-btn ${isListening ? 'listening' : ''}`}
                onClick={handleVoiceInput}
                title="Voice input"
                disabled={isLoading || isSpeaking || isVoiceMode}
            >
                <FaMicrophone size={18} />
            </button>

            <textarea
                rows={1}
                ref={inputRef}
                className="chat-input-field"
                value={input}
                maxLength={2000}
                onChange={(e) => { setInput(e.target.value.slice(0, 2000)); resizeTextarea(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder={isVoiceMode ? (voiceStatus === "listening" ? "Listening..." : voiceStatus === "speaking" ? "Speaking..." : "Speak now...") : pendingFile ? "Add a message..." : "Type your message..."}
                disabled={isLoading || isVoiceMode}
            />

            <button
                type="submit"
                className="action-btn-icon send-btn"
                title="Send message"
                disabled={isLoading || (!input.trim() && !pendingFile) || isVoiceMode}
            >
                <BsArrowUpCircleFill size={24} />
            </button>

            {/* Mode switch is handled in the header tabs */}

            {/* Live Voice Mode Button */}
            <button
                type="button"
                className={`live-mode-btn ${isVoiceMode ? 'active' : ''}`}
                onClick={toggleVoiceMode}
                title={isVoiceMode ? "Exit Live Mode" : "Enter Live Mode"}
                disabled={isLoading}
            >
                <BsSoundwave size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
