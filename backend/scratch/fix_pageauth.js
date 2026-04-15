const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

// The fused broken block (handles CRLF)
const broken = `            if (walletData.success) {\r\n              setWalletBalance(walletData.balance);\r\n            }\r\n        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';\r\n        const [listingsRes, eventsRes, walletRes] = await Promise.all([\r\n          fetch(\`\${API_URL}/listings?status=all\`),\r\n          fetch(\`\${API_URL}/blockchain/events\`),\r\n          fetch(\`\${API_URL}/wallet/balance?buyerId=\${currentUser?.id || 'b1'}\`)\r\n        ])\r\n        const listingsData = await listingsRes.json()\r\n        const eventsData = await eventsRes.json()\r\n        const walletData = await walletRes.json()\r\n        setListings(listingsData.listings || [])\r\n        setBlockchainEvents(eventsData.events || [])\r\n        if (walletData.success) {\r\n          setWalletBalance(walletData.balance || 0)\r\n        }\r\n      } catch (error) {\r\n        console.error('Error fetching data:', error)\r\n      } finally {\r\n        setLoading(false)\r\n      }\r\n    }\r\n    fetchData()\r\n  }, [currentUser?.id])`;

const fixed = `            if (walletData.success) {
              setWalletBalance(walletData.balance);
            }
          } else {
            console.error('Auth verification failed:', data.error);
            handleLogout();
          }
        } catch (e) {
          console.error('Error during auth verification:', e);
          handleLogout();
        }
      }
    };
    checkAuth();
  }, [])

  // Handle Razorpay redirect-back: auto-credit wallet after payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      const refId = params.get('ref')
      const paidAmount = parseFloat(params.get('amount'))
      const paidUserId = params.get('userId')
      window.history.replaceState({}, '', '/')
      const processReturn = async () => {
        try {
          const token = localStorage.getItem('farmbid_token') || localStorage.getItem('token')
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
          const res = await fetch(\`\${API_URL}/wallet/topup\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify({ userId: paidUserId, amount: paidAmount, paymentMethod: 'razorpay', referenceId: refId })
          })
          const data = await res.json()
          if (data.success) {
            setWalletBalance(data.newBalance)
            toast.success(\`🎉 ₹\${paidAmount} added to your wallet!\`, { duration: 6000 })
          }
        } catch (e) { console.error('Razorpay return handler:', e) }
      }
      processReturn()
    }
  }, [])

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('farmbid_token')
    localStorage.removeItem('farmbid_user')
    setCurrentUser(null)
    setIsAuthenticated(false)
    window.location.href = '/login'
  }

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const [listingsRes, eventsRes, walletRes] = await Promise.all([
          fetch(\`\${API_URL}/listings?status=all\`),
          fetch(\`\${API_URL}/blockchain/events\`),
          fetch(\`\${API_URL}/wallet/balance?buyerId=\${currentUser?.id || 'b1'}\`)
        ])
        const listingsData = await listingsRes.json()
        const eventsData = await eventsRes.json()
        const walletData = await walletRes.json()
        setListings(listingsData.listings || [])
        setBlockchainEvents(eventsData.events || [])
        if (walletData.success) {
          setWalletBalance(walletData.balance || 0)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentUser?.id])`;

if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully fixed the fused auth+fetchData block and added Razorpay return handler.');
} else {
  // Try normalizing line endings and check
  const normalBroken = broken.replace(/\r\n/g, '\n');
  const normalContent = content.replace(/\r\n/g, '\n');
  if (normalContent.includes(normalBroken)) {
    const newContent = normalContent.replace(normalBroken, fixed);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Fixed with normalized line endings.');
  } else {
    console.log('❌ Could not find target block. Printing first 200 chars around "walletData.success" for debug:');
    const idx = content.indexOf('setWalletBalance(walletData.balance);');
    console.log(JSON.stringify(content.substring(idx - 50, idx + 400)));
  }
}
