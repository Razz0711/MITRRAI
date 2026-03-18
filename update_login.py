import re

file_path = r'src/app/login/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. State removals
text = re.sub(
    r"\s*const \[admissionNumber, setAdmissionNumber\] = useState\(''\);\s*const \[department, setDepartment\] = useState\(''\);\s*const \[yearLevel, setYearLevel\] = useState\(''\);",
    '', text
)

# 2. Field auto-fill removals
text = re.sub(
    r"\s*// Auto-fill fields\s*setAdmissionNumber\(result\.parsed\.admissionNumber\);\s*setDepartment\(result\.parsed\.department\);\s*setYearLevel\(result\.parsed\.yearLevel\);",
    '', text
)

# 3. verifyOtpAndProceed setOtpVerifying(true)
text = re.sub(
    r"(const trimmedEmail = email\.trim\(\)\.toLowerCase\(\);\s*setOtpVerifying\(true\);\s*)setError\(''\);",
    r"\g<1>setLoadingText('Verifying code...');\n    setError('');",
    text
)

# 4. verifyOtpAndProceed if (isSignup)
text = re.sub(
    r"(// OTP verified — now do actual login/signup\s*)if \(isSignup\) \{",
    r"\g<1>setLoadingText(isSignup ? 'Creating your profile (this can take ~5 seconds)...' : 'Signing you in...');\n      if (isSignup) {",
    text
)

# 5. verifyOtpAndProceed signup() payload
text = re.sub(
    r"admissionNumber:\s*admissionNumber\.trim\(\)\.toUpperCase\(\),\s*department,\s*yearLevel,",
    "admissionNumber: parsedEmail?.admissionNumber || '',\n          department: parsedEmail?.department || '',\n          yearLevel: parsedEmail?.yearLevel || '',",
    text
)

# 6. handleSubmit validations
text = re.sub(
    r"if \(!admissionNumber\.trim\(\) && !parsedEmail\) \{.*?\}.*?if \(!department && !parsedEmail\) \{.*?\}.*?if \(!yearLevel && !parsedEmail\) \{.*?\}",
    "if (!parsedEmail) { setError('Your email must be a valid SVNIT student format (e.g., i22ma038@amhd.svnit.ac.in)'); return; }",
    text,
    flags=re.DOTALL
)

# 7. Demo account signup() payload
text = re.sub(
    r"admissionNumber:\s*admissionNumber\.trim\(\)\.toUpperCase\(\),\s*department,\s*yearLevel,",
    "admissionNumber: parsedEmail?.admissionNumber || '',\n          department: parsedEmail?.department || '',\n          yearLevel: parsedEmail?.yearLevel || '',",
    text
)

# 8. Remove Manual Fields JSX completely
text = re.sub(
    r"\{\s*/\*\s*Manual fields only if email not parsed\s*\*/.*?\}\s*\{isSignup && \(",
    r"{isSignup && (",
    text,
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("success")
