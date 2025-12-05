#!/bin/bash

echo "Starting Next.js server..."
npm run dev &
NEXT_PID=$!

echo "Starting Node.js backend..."
cd backend
npm run dev &
NODE_PID=$!
cd ..

echo "Starting Python server..."
cd pyserver
uvicorn server:app --reload &
PY_PID=$!
cd ..

echo ""
echo "All servers started!"
echo "Next.js PID: $NEXT_PID"
echo "Node.js PID: $NODE_PID"
echo "Python PID: $PY_PID"
echo ""

# Keep script running so child processes stay alive
wait
