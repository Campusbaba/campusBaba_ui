// ─── Shared ─────────────────────────────────────────────────────────────────
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
}

// ─── Student ─────────────────────────────────────────────────────────────────
export interface Student {
  _id: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  address: Address;
  parentId?: string | Parent;
  enrollmentDate: string;
  status: "active" | "inactive" | "graduated" | "suspended";
  classRoomId?: string | ClassRoom;
  profileImage?: string;
  emergencyContact: EmergencyContact;
  medicalInfo?: {
    bloodGroup?: string;
    allergies?: string[];
    medications?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Parent ──────────────────────────────────────────────────────────────────
export interface Parent {
  _id: string;
  parentId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  occupation?: string;
  address: Address;
  relationship: "father" | "mother" | "guardian";
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Teacher ─────────────────────────────────────────────────────────────────
export interface Teacher {
  _id: string;
  teacherId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  address: Address;
  qualification: string;
  specialization: string[];
  experience: number;
  joiningDate: string;
  salary: number;
  status: "active" | "inactive" | "on-leave";
  departmentId?: string | Department;
  profileImage?: string;
  emergencyContact: EmergencyContact;
  createdAt: string;
  updatedAt: string;
}

// ─── Employee ────────────────────────────────────────────────────────────────
export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  address: Address;
  position: string;
  department: string;
  joiningDate: string;
  salary: number;
  status: "active" | "inactive" | "on-leave";
  profileImage?: string;
  emergencyContact: EmergencyContact;
  createdAt: string;
  updatedAt: string;
}

// ─── Department ──────────────────────────────────────────────────────────────
export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  headOfDepartment?: string | Teacher;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// ─── Course ──────────────────────────────────────────────────────────────────
export interface Course {
  _id: string;
  name: string;
  code: string;
  description?: string;
  departmentId: string | Department;
  credits: number;
  duration: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// ─── ClassRoom ───────────────────────────────────────────────────────────────
export interface ClassRoom {
  _id: string;
  classRoomId: string;
  name: string;
  roomNumber: string;
  departmentId: string | Department;
  courseId: string | Course;
  capacity: number;
  currentEnrollment: number;
  academicYear: string;
  semester: string;
  status: "active" | "inactive" | "completed";
  createdAt: string;
  updatedAt: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export interface Attendance {
  _id: string;
  studentId: string | Student;
  classRoomId: string | ClassRoom;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
  markedBy: string | Teacher;
  createdAt: string;
  updatedAt: string;
}

// ─── Routine ─────────────────────────────────────────────────────────────────
export interface Routine {
  _id: string;
  classRoomId: string | ClassRoom;
  teacherId: string | Teacher;
  dayOfWeek:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  startTime: string;
  endTime: string;
  subject: string;
  roomNumber: string;
  status: "active" | "cancelled" | "rescheduled";
  createdAt: string;
  updatedAt: string;
}

// ─── Exam ─────────────────────────────────────────────────────────────────────
export interface Exam {
  _id: string;
  examId: string;
  name: string;
  examType: "midterm" | "final" | "quiz" | "assignment" | "practical";
  courseId: string | Course;
  classRoomId: string | ClassRoom;
  date: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  instructions?: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// ─── ExamMark ────────────────────────────────────────────────────────────────
export interface ExamMark {
  _id: string;
  examId: string | Exam;
  studentId: string | Student;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  evaluatedBy: string | Teacher;
  evaluatedAt?: string;
  status: "pending" | "evaluated" | "published";
  createdAt: string;
  updatedAt: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export interface Payment {
  _id: string;
  paymentId?: string;
  studentId: string | Student;
  courseId: string | Course;
  amount: number;
  paymentType:
    | "tuition"
    | "exam"
    | "library"
    | "transport"
    | "hostel"
    | "other";
  paymentMethod: "cash" | "card" | "bank-transfer" | "online";
  transactionId?: string;
  dueDate: string;
  paidDate?: string;
  paymentStatus: "pending" | "paid" | "overdue" | "cancelled";
  academicYear: string;
  semester: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Enrollment ───────────────────────────────────────────────────────────────
export interface Enrollment {
  _id: string;
  paymentStatus: "pending" | "paid" | "overdue" | "cancelled";
  paymentType: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  academicYear: string;
  semester: string;
  remarks?: string;
  student: {
    _id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: "active" | "inactive" | "graduated" | "suspended";
  };
  course: {
    _id: string;
    name: string;
    code: string;
    credits: number;
    duration: number;
  };
}

// ─── Expense ──────────────────────────────────────────────────────────────────
export interface Expense {
  _id: string;
  category: "salary" | "fixed" | "other";
  subcategory: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: "cash" | "card" | "bank-transfer" | "cheque";
  transactionId?: string;
  employeeId?: string | Employee;
  approvedBy?: string | Employee;
  status: "pending" | "approved" | "paid" | "rejected";
  attachments?: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Notice ───────────────────────────────────────────────────────────────────
export interface Notice {
  _id: string;
  title: string;
  content: string;
  category: "general" | "academic" | "exam" | "event" | "holiday" | "urgent";
  targetAudience: ("student" | "parent" | "teacher" | "employee" | "all")[];
  publishDate: string;
  expiryDate?: string;
  attachments?: string[];
  createdBy: string | Employee;
  modifiedBy?: string | Employee;
  modifiedByModel?: "Teacher" | "Employee";
  status: "draft" | "published" | "archived";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardStats {
  studentsEnrolled: number;
  teachersEnrolled: number;
  todaysClasses: number;
  activeStudents: number;
  activeTeachers: number;
}
