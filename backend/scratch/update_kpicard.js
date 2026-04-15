const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

const target = `// Admin KPI Card
const KPICard = ({ title, value, icon: Icon, trend, trendUp }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={\`text-xs flex items-center mt-1 \${trendUp ? 'text-green-500' : 'text-red-500'}\`}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend}
            </p>
          )}
        </div>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
)`;

const replacement = `// Dynamic KPI Card with Real-Time Growth Engine
const KPICard = ({ title, value, icon: Icon, trend: defaultTrend, trendUp: defaultTrendUp }) => {
  const [prevValue, setPrevValue] = useState(value)
  const [dynamicTrend, setDynamicTrend] = useState(defaultTrend)
  const [isTrendUp, setIsTrendUp] = useState(defaultTrendUp)

  // Calculate real-time percentage changes whenever the data value updates
  useEffect(() => {
    if (value === prevValue) return;
    
    // Extract base numbers from formatted strings (e.g. "₹2,500" -> 2500)
    const strCurrent = String(value).replace(/[^0-9.-]+/g, "");
    const strPrev = String(prevValue).replace(/[^0-9.-]+/g, "");
    const numCurrent = parseFloat(strCurrent);
    const numPrev = parseFloat(strPrev);
    
    // Only calculate if we have valid numbers AND strings weren't completely empty
    if (!isNaN(numCurrent) && !isNaN(numPrev) && strCurrent && strPrev) {
      if (numPrev === 0 && numCurrent > 0) {
        setDynamicTrend('+100% just now')
        setIsTrendUp(true)
      } else if (numPrev > 0) {
        const pctChange = ((numCurrent - numPrev) / numPrev) * 100
        const formattedPct = Math.abs(pctChange).toFixed(1)
        setIsTrendUp(pctChange >= 0)
        setDynamicTrend(\`\${pctChange >= 0 ? '+' : '-'}\${formattedPct}% from previous\`)
      }
    }
    setPrevValue(value)
  }, [value, prevValue])

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {(dynamicTrend || defaultTrend) && (
              <p className={\`text-xs flex items-center mt-1 \${isTrendUp ? 'text-green-500' : 'text-red-500'} animate-in fade-in slide-in-from-left-2 duration-500\`}>
                {isTrendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {dynamicTrend || defaultTrend}
              </p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}`;

// Normalize line endings for replacement mapping
const targetCRLF = target.replace(/\n/g, '\r\n');
if (content.includes(targetCRLF)) {
  content = content.replace(targetCRLF, replacement.replace(/\n/g, '\r\n'));
} else if (content.includes(target)) {
  content = content.replace(target, replacement);
} else {
  console.log("Could not find KPICard target in page.js");
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully upgraded KPICard to support real-time dynamic growth rates!");
