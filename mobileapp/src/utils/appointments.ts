export type AppointmentStatus =
  | 'Pending'
  | 'Scheduled'
  | 'Approved'
  | 'Rejected'
  | 'Completed'
  | 'Cancelled';

export const UPCOMING_APPOINTMENT_STATUSES: AppointmentStatus[] = ['Pending', 'Scheduled', 'Approved'];

export const REVIEWABLE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['Pending', 'Scheduled'];

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; tone: string }
> = {
  Pending: {
    label: 'Pending approval',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  Scheduled: {
    label: 'Pending approval',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  Approved: {
    label: 'Approved',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  Rejected: {
    label: 'Rejected',
    tone: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  Completed: {
    label: 'Completed',
    tone: 'bg-skyblue-50 text-skyblue-700 border-skyblue-100',
  },
  Cancelled: {
    label: 'Cancelled',
    tone: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const isUpcomingAppointment = (status?: string | null) =>
  !!status && UPCOMING_APPOINTMENT_STATUSES.includes(status as AppointmentStatus);

export const isReviewableAppointment = (status?: string | null) =>
  !!status && REVIEWABLE_APPOINTMENT_STATUSES.includes(status as AppointmentStatus);

export const getAppointmentStatusMeta = (status?: string | null) => {
  if (!status || !(status in STATUS_META)) {
    return {
      label: 'Unknown',
      tone: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }

  return STATUS_META[status as AppointmentStatus];
};
