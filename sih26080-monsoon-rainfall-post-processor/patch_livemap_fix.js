import fs from 'fs';
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf8');

// Replace all combinations of the buttons manually.
// Notice that inside the buttons, the divs close the inner structure.
// The button replacement logic before was:
// <div className="flex items-center text-left gap-2 p-1.5 rounded-lg bg-slate-950/70...
// became
// <button className="...">

// The original block ended with:
//                         <div className="text-[9px] text-slate-400 font-mono">&gt; 64.5 mm/24h</div>
//                       </div>
//                     </div>
// The last </div> was the closing tag for the container that is now a <button>.
// Let's replace the last </div> before the comment with </button>.

content = content.replace(/<\/div>\s*<\/div>\s*\{\/\* Moderate Rain \*\/\}/g, '</div>\n                    </button>\n                    {/* Moderate Rain */}');
content = content.replace(/<\/div>\s*<\/div>\s*\{\/\* Light Rain \*\/\}/g, '</div>\n                    </button>\n                    {/* Light Rain */}');
content = content.replace(/<\/div>\s*<\/div>\s*\{\/\* Dry \/ Break \*\/\}/g, '</div>\n                    </button>\n                    {/* Dry / Break */}');
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Remote Sensing/g, '</div>\n                    </button>\n                  </div>\n                  {/* Remote Sensing');

fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('Fixed button tags');
