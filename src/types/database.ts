export type Studio = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  address_normalized: string | null;
  latitude: number | null;
  longitude: number | null;
  offers_trial: boolean;
  owner_id: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
};

export type Class = {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  category: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

export type TrialSignup = {
  id: string;
  studio_id: string;
  email: string;
  signed_up_at: string;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const CLASS_CATEGORIES = [
  "Yoga",
  "Pilates",
  "HIIT",
  "Strength",
  "Dance",
  "Cycling",
  "Martial Arts",
  "Barre",
  "Meditation",
  "Other",
] as const;
