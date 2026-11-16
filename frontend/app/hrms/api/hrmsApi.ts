import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

// Dashboard
export const getHrmsDashboard = () => axiosInstance.get(ProjectApiList.HRMS_DASHBOARD);

// Designations
export const getDesignations = () => axiosInstance.get(ProjectApiList.GET_DESIGNATIONS);
export const createDesignation = (data: any) => axiosInstance.post(ProjectApiList.CREATE_DESIGNATION, data);
export const updateDesignation = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.UPDATE_DESIGNATION}/${id}`, data);
export const deleteDesignation = (id: number) => axiosInstance.delete(`${ProjectApiList.DELETE_DESIGNATION}/${id}`);

// Departments
export const getHrmsDepartments = () => axiosInstance.get(ProjectApiList.GET_HRMS_DEPARTMENTS);
export const createHrmsDepartment = (data: any) => axiosInstance.post(ProjectApiList.CREATE_HRMS_DEPARTMENT, data);
export const updateHrmsDepartment = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.UPDATE_HRMS_DEPARTMENT}/${id}`, data);
export const deleteHrmsDepartment = (id: number) => axiosInstance.delete(`${ProjectApiList.DELETE_HRMS_DEPARTMENT}/${id}`);

// Employees
export const getEmployees = (params?: any) => axiosInstance.get(ProjectApiList.GET_EMPLOYEES, { params });
export const createEmployee = (data: any) => axiosInstance.post(ProjectApiList.CREATE_EMPLOYEE, data);
export const updateEmployee = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.UPDATE_EMPLOYEE}/${id}`, data);
export const deleteEmployee = (id: number) => axiosInstance.delete(`${ProjectApiList.DELETE_EMPLOYEE}/${id}`);
export const getEmployeeById = (id: number) => axiosInstance.get(`${ProjectApiList.GET_SINGLE_EMPLOYEE}/${id}`);

// Attendance
export const getAttendance = (params?: any) => axiosInstance.get(ProjectApiList.GET_ATTENDANCE, { params });
export const markAttendance = (data: any) => axiosInstance.post(ProjectApiList.MARK_ATTENDANCE, data);
export const markBulkAttendance = (data: any) => axiosInstance.post(ProjectApiList.MARK_BULK_ATTENDANCE, data);
export const markMultipleAttendance = (data: any) => axiosInstance.post(ProjectApiList.MARK_MULTIPLE_ATTENDANCE, data);
export const getAttendanceReport = (params?: any) => axiosInstance.get(ProjectApiList.GET_ATTENDANCE_REPORT, { params });
export const updateAttendance = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.UPDATE_ATTENDANCE}/${id}`, data);

// Leaves
export const getLeaveTypes = () => axiosInstance.get(ProjectApiList.GET_LEAVE_TYPES);
export const createLeaveType = (data: any) => axiosInstance.post(ProjectApiList.CREATE_LEAVE_TYPE, data);
export const updateLeaveType = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.UPDATE_LEAVE_TYPE}/${id}`, data);
export const deleteLeaveType = (id: number) => axiosInstance.delete(`${ProjectApiList.DELETE_LEAVE_TYPE}/${id}`);
export const getLeaveRequests = (params?: any) => axiosInstance.get(ProjectApiList.GET_LEAVE_REQUESTS, { params });
export const createLeaveRequest = (data: any) => axiosInstance.post(ProjectApiList.CREATE_LEAVE_REQUEST, data);
export const getLeaveRequest = (id: number) => axiosInstance.get(`${ProjectApiList.GET_LEAVE_REQUEST}/${id}`);
export const approveLeaveRequest = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.APPROVE_LEAVE_REQUEST}/${id}/approve`, data);
export const rejectLeaveRequest = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.REJECT_LEAVE_REQUEST}/${id}/reject`, data);
export const cancelLeaveRequest = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.CANCEL_LEAVE_REQUEST}/${id}/cancel`, data);
export const getAttendanceCalendar = (employeeId: number, params?: any) => axiosInstance.get(`${ProjectApiList.GET_ATTENDANCE_CALENDAR}/${employeeId}/attendance-calendar`, { params });

// Salary
export const getSalaryStructures = () => axiosInstance.get(ProjectApiList.GET_SALARY_STRUCTURES);
export const upsertSalaryStructure = (data: any) => axiosInstance.post(ProjectApiList.UPSERT_SALARY_STRUCTURE, data);
export const getSalaries = (params?: any) => axiosInstance.get(ProjectApiList.GET_SALARIES, { params });
export const generateSalary = (data: any) => axiosInstance.post(ProjectApiList.GENERATE_SALARY, data);
export const updatePayoutStatus = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.UPDATE_PAYOUT_STATUS}/${id}/status`, data);
export const calculatePayroll = (month: string) => axiosInstance.get(`${ProjectApiList.CALCULATE_PAYROLL}?month=${month}`);
export const getSalaryById = (id: number) => axiosInstance.get(`${ProjectApiList.GET_SALARY}/${id}`);

// Holidays
export const getHolidays = () => axiosInstance.get(ProjectApiList.GET_HOLIDAYS);
export const createHoliday = (data: any) => axiosInstance.post(ProjectApiList.CREATE_HOLIDAY, data);
export const updateHoliday = (id: number, data: any) => axiosInstance.post(`${ProjectApiList.UPDATE_HOLIDAY}/${id}`, data);
export const deleteHoliday = (id: number) => axiosInstance.delete(`${ProjectApiList.DELETE_HOLIDAY}/${id}`);

// Auth
export const changePassword = (data: any) => axiosInstance.post(ProjectApiList.changePassword, data);
