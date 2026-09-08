NODE_ENV=production node dist/server.cjs &
PROD_PID=$!
sleep 2
curl -s -I http://localhost:3000/
kill $PROD_PID
