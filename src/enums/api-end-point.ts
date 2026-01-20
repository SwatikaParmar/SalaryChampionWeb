export enum ApiEndPoint {
  otp = 'auth/requestOtp',
  verifyOtp = 'auth/verifyOtp',
  previewPan = 'kyc/pan/previewPan',
  verifyPan = 'kyc/pan/verifyPan',
  saveBasicDetail = 'lead/saveBasicDetails',
  borrowerSnapshot = 'lead/getBorrowerSnapshot',
  saveAddressDetail = 'lead/saveAddressDetails',
  resolvePincode = 'public/pincodes',
  saveIncomeDetail = 'lead/saveEmploymentDetails',
  imageUpload = 'upload/createUploadIntent',
  completeUpload = 'upload/completeUpload',
  emiLoanQuote = 'loan/quote',
  acceptLoan = 'loan/decision',
  postEmploymentDetail = 'loan/upsertCompanyDetail',
  ekycStart = 'kyc/aadhaar/start',
  checkEligibility = 'loan/eligibility/evaluate'
}
