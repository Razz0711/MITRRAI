const fs = require('fs');
let c = fs.readFileSync('src/app/login/page.tsx', 'utf8');
const searchElement = /  \/\/ Redirect if already logged in\r?\n  if \(user\) \{\r?\n    router\.push\('\/home'\);\r?\n    return null;\r?\n  }/g;
c = c.replace(searchElement, `  // Redirect if already logged in
  if (user) {
    if (isSignup) {
      router.push('/onboarding');
    } else {
      router.push('/home');
    }
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
    );
  }`);
fs.writeFileSync('src/app/login/page.tsx', c);
