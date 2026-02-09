import { z } from "zod";

const optionalString = z.string().trim().optional().nullable();
const optionalNumber = z.number().optional().nullable();

export const updateCompanySchema = z.object({
  name: optionalString,
  nameAr: optionalString,
  fullName: optionalString,
  tagline: optionalString,
  logo: optionalString,
  favicon: optionalString,
  phone: optionalString,
  phone2: optionalString,
  whatsapp: optionalString,
  email: optionalString,
  website: optionalString,
  country: optionalString,
  city: optionalString,
  address: optionalString,
  addressAr: optionalString,
  mapUrl: optionalString,
  taxNumber: optionalString,
  commercialRegister: optionalString,
  licenseNumber: optionalString,
  facebook: optionalString,
  instagram: optionalString,
  twitter: optionalString,
  youtube: optionalString,
  tiktok: optionalString,
  foundedYear: optionalNumber,
  employeesCount: optionalNumber,
  description: optionalString,
  descriptionAr: optionalString,
  ownerName: optionalString,
  ownerPhone: optionalString,
});

export const updateInvoiceSettingsSchema = z.object({
  invoicePrefix: optionalString,
  invoiceNumberLength: optionalNumber,
  invoiceStartNumber: optionalNumber,
  taxEnabled: optionalNumber,
  taxRate: optionalNumber,
  taxName: optionalString,
  taxNumber: optionalString,
  printHeader: optionalString,
  printFooter: optionalString,
  showLogo: optionalNumber,
  showQrCode: optionalNumber,
  paperSize: optionalString,
  termsAndConditions: optionalString,
  returnPolicy: optionalString,
  warrantyTerms: optionalString,
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type UpdateInvoiceSettingsInput = z.infer<typeof updateInvoiceSettingsSchema>;
