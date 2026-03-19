const fs = require('fs');
const file = 'src/app/login/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
console.log("Line 86:", JSON.stringify(lines[85]));
console.log("Line 87:", JSON.stringify(lines[86]));
console.log("Line 88:", JSON.stringify(lines[87]));

if (lines[87].includes('return null')) {
  lines[86] = `    // Handled redirect`;
  lines[87] = `    if (isSignup) { router.push('/onboarding'); } else { router.push('/home'); }
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 transition-opacity duration-300">
        <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-[#7c71ff]/10">
          <Image src="/logo.jpg" alt="MitrrAi" width={40} height={40} className="w-10 h-10 rounded-xl" />
        </div>
        <div className="flex gap-1.5 items-center justify-center tracking-widest text-[#7c71ff]">
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-white/40 text-sm mt-5 font-medium animate-pulse">
          {isSignup ? 'Setting up your profile...' : 'Taking you to campus...'}
        </p>
      </div>
    );`;
  fs.writeFileSync(file, lines.join('\n'));
  console.log("Fixed!");
} else {
  console.log("Not found at line 88!");
}
