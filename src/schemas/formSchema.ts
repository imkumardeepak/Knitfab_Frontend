import * as yup from 'yup';

export const comprehensiveFormSchema = yup.object({
  // Personal Information
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
  
  dateOfBirth: yup
    .date()
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'You must be at least 18 years old', function(value) {
      if (!value) return false;
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 18;
      }
      return age >= 18;
    }),

  // Address Information
  address: yup
    .string()
    .required('Address is required')
    .min(10, 'Address must be at least 10 characters'),
  
  city: yup
    .string()
    .required('City is required')
    .min(2, 'City must be at least 2 characters'),
  
  state: yup
    .string()
    .required('State is required'),
  
  zipCode: yup
    .string()
    .required('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  
  country: yup
    .string()
    .required('Country is required'),

  // Preferences
  gender: yup
    .string()
    .required('Gender is required')
    .oneOf(['male', 'female', 'other', 'prefer-not-to-say'], 'Please select a valid gender'),
  
  interests: yup
    .array()
    .of(yup.string())
    .min(1, 'Please select at least one interest'),
  
  newsletter: yup
    .boolean()
    .required(),
  
  notifications: yup
    .boolean()
    .required(),

  // Professional Information
  jobTitle: yup
    .string()
    .required('Job title is required')
    .min(2, 'Job title must be at least 2 characters'),
  
  company: yup
    .string()
    .required('Company is required')
    .min(2, 'Company name must be at least 2 characters'),
  
  experience: yup
    .number()
    .required('Experience is required')
    .min(0, 'Experience cannot be negative')
    .max(50, 'Experience cannot exceed 50 years'),
  
  salary: yup
    .number()
    .required('Salary range is required')
    .min(0, 'Salary cannot be negative'),

  // Additional Information
  bio: yup
    .string()
    .max(500, 'Bio must not exceed 500 characters'),
  
  website: yup
    .string()
    .url('Please enter a valid URL')
    .nullable(),
  
  linkedIn: yup
    .string()
    .url('Please enter a valid LinkedIn URL')
    .nullable(),

  // File Upload
  resume: yup
    .mixed()
    .nullable(),

  // Terms and Conditions
  terms: yup
    .boolean()
    .oneOf([true], 'You must accept the terms and conditions'),
  
  privacy: yup
    .boolean()
    .oneOf([true], 'You must accept the privacy policy'),
});

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  gender: string;
  interests: string[];
  newsletter: boolean;
  notifications: boolean;
  jobTitle: string;
  company: string;
  experience: number;
  salary: number;
  bio?: string;
  website?: string | null;
  linkedIn?: string | null;
  resume?: any;
  terms?: boolean;
  privacy?: boolean;
}
