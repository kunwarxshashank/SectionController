# ALL POSSIBLE SCENARIOS - DECISION TREE FORMAT
## Complete Decision Logic for Vidisha Station Train Management
## SCENARIO 1: HIGH PRIORITY TRAIN DELAYED

```
IF highPriorityTrain.isDelayed:

    IF platform.isFree:
        ✅ Allow High Priority Train to Enter Immediately
        ACTION: "Train {trainName} cleared to enter Platform {platformId}"
        
    ELSE:
        IF lowPriorityTrain.canExitQuickly:
            ✅ Fast-track Low Priority Train Exit
            ✅ Then Allow High Priority Train
            ACTION: "Train {lowPriorityName} expedited exit, {highPriorityName} to enter after clearance"
            
        ELSE IF alternatePlatformAvailable:
            ✅ Reroute High Priority Train to Alternate Platform
            ACTION: "REROUTE train {highPriorityName} to Platform {alternatePlatformId}"
            
        ELSE:
            ✅ Hold High Priority at Signal
            ✅ Force Early Clearance of Low Priority Train
            ACTION: "HALT train {highPriorityName} at signal, force clearance of {lowPriorityName}"
```

---

## SCENARIO 2: SINGLE TRAIN ARRIVAL (NORMAL OPERATION)

```
IF singleTrain.isArriving:

    IF mainLine.isFree AND noMaintenance:
        ✅ Allow Train on Main Line (Optimal Route)
        ACTION: "Train {trainName} continues on Main Line - fastest route"
        
    ELSE IF mainLine.isBlocked:
        IF loopLine1.isFree:
            ✅ Reroute to Loop Line 1
            ACTION: "REROUTE train {trainName} to Loop Line 1 (adds {delayMin} min)"
            
        ELSE IF loopLine2.isFree:
            ✅ Reroute to Loop Line 2
            ACTION: "REROUTE train {trainName} to Loop Line 2 (adds {delayMin} min)"
            
        ELSE:
            ✅ Hold at Entry Signal
            ACTION: "HALT train {trainName} at entry signal - all tracks occupied"
```

---

## SCENARIO 3: TWO TRAINS SAME PRIORITY

```
IF train1.priority == train2.priority:

    IF mainLine.isFree:
        IF train1.arrivedFirst:
            ✅ Train 1 gets Main Line
            ✅ Train 2 waits or uses Loop
            ACTION: "Train {train1Name} on Main Line, {train2Name} to Loop Line"
            
        ELSE:
            ✅ Train 2 gets Main Line
            ✅ Train 1 waits or uses Loop
            ACTION: "Train {train2Name} on Main Line, {train1Name} to Loop Line"
            
    ELSE IF mainLine.isOccupied:
        IF loopLine1.isFree AND loopLine2.isFree:
            ✅ Distribute to Both Loops
            ACTION: "Train {train1Name} to Loop 1, {train2Name} to Loop 2"
            
        ELSE IF onlyOneLoopFree:
            ✅ First Train to Loop
            ✅ Second Train Waits
            ACTION: "Train {firstTrain} to available loop, {secondTrain} WAIT at signal"
            
        ELSE:
            ✅ Both Trains Wait
            ACTION: "HALT both trains - all tracks occupied"
```

---

## SCENARIO 4: THREE TRAINS DIFFERENT PRIORITIES (OVERTAKING)

```
IF train1.priority < train2.priority < train3.priority:

    IF mainLine.isFree:
        ✅ Highest Priority Train gets Main Line
        ACTION: "Train {highestPriorityName} (Priority: {priority}) on Main Line"
        
        IF loopLine1.isFree:
            ✅ Medium Priority to Loop 1
            ACTION: "Train {mediumPriorityName} to Loop Line 1"
            
        IF loopLine2.isFree:
            ✅ Lowest Priority to Loop 2
            ACTION: "Train {lowestPriorityName} to Loop Line 2"
            
    ELSE IF mainLine.isOccupiedBy(lowPriorityTrain):
        IF loopLine.isFree:
            ✅ Move Low Priority Train to Loop
            ✅ High Priority Train takes Main Line
            ACTION: "REROUTE train {lowPriorityName} to Loop, {highPriorityName} on Main Line"
            
        ELSE:
            ✅ Halt Low Priority Train
            ✅ Allow High Priority to Pass
            ACTION: "HALT train {lowPriorityName}, pass train {highPriorityName} (saves {timeSaved} min)"
            
    ELSE IF allTracksOccupied:
        ✅ Queue by Priority Order
        ✅ Highest Priority Waits Shortest
        ACTION: "Queue: {train3Name}, {train2Name}, {train1Name} in priority order"
```

---

## SCENARIO 5: EMERGENCY TRAIN ARRIVAL

```
IF emergencyTrain.isApproaching:

    IF mainLine.isFree:
        ✅ Immediate Clearance on Main Line
        ACTION: "EMERGENCY: Train {emergencyName} cleared on Main Line - highest priority"
        
    ELSE IF mainLine.isOccupiedBy(regularTrain):
        IF loopLine.isFree:
            ✅ Move Regular Train to Loop Immediately
            ✅ Emergency gets Main Line
            ACTION: "EMERGENCY REROUTE: {regularName} to Loop, {emergencyName} on Main Line"
            
        ELSE IF regularTrain.canStopAtSignal:
            ✅ Force Regular Train to Stop
            ✅ Emergency Passes First
            ACTION: "HALT train {regularName} at signal, EMERGENCY train {emergencyName} passes first"
            
        ELSE:
            ✅ Clear All Tracks
            ✅ Emergency Override
            ACTION: "EMERGENCY OVERRIDE: Clear all tracks for {emergencyName}"
```

---

## SCENARIO 6: MAIN LINE SIGNAL FAILURE

```
IF mainLine.signalFailed:

    IF loopLine1.isFree AND loopLine1.isOperational:
        ✅ Reroute All Trains to Loop 1
        ACTION: "Signal failure on Main Line - REROUTE all trains to Loop Line 1"
        
    ELSE IF loopLine2.isFree AND loopLine2.isOperational:
        ✅ Reroute All Trains to Loop 2
        ACTION: "Signal failure on Main Line - REROUTE all trains to Loop Line 2"
        
    ELSE IF bothLoopsFree:
        ✅ Distribute by Priority
        ACTION: "High priority to Loop 1, Low priority to Loop 2"
        
    ELSE:
        ✅ Hold All Trains at Entry
        ✅ Wait for Signal Repair
        ACTION: "HALT all trains - Main line signal failure, loops occupied"
```

---

## SCENARIO 7: LOOP LINE UNDER MAINTENANCE

```
IF loopLine1.underMaintenance:

    IF mainLine.isFree:
        ✅ All Trains use Main Line
        ACTION: "Train {trainName} on Main Line (Loop 1 under maintenance)"
        
    ELSE IF mainLine.isOccupied:
        IF loopLine2.isFree:
            ✅ Use Loop Line 2 (Only Alternative)
            ACTION: "REROUTE train {trainName} to Loop Line 2 (Loop 1 maintenance)"
            
        ELSE:
            ✅ Wait for Main Line or Loop 2
            ACTION: "HALT train {trainName} - Loop 1 maintenance, other tracks occupied"
            
    IF bothLoopsUnderMaintenance:
        ✅ Main Line Only Operations
        ✅ Sequential Train Entry
        ACTION: "Single track operation - Main Line only, trains queued by priority"
```

---

## SCENARIO 8: FIVE TRAINS PEAK HOUR CONGESTION

```
IF trainCount >= 5 AND peakHour:

    // Priority Sorting
    trains.sortByPriority(descending)
    
    IF mainLine.isFree:
        ✅ Highest Priority Train to Main Line
        ACTION: "Train {train1Name} (Priority: {p1}) on Main Line"
        
    IF loopLine1.isFree:
        ✅ Second Highest Priority to Loop 1
        ACTION: "Train {train2Name} (Priority: {p2}) to Loop Line 1"
        
    IF loopLine2.isFree:
        ✅ Third Highest Priority to Loop 2
        ACTION: "Train {train3Name} (Priority: {p3}) to Loop Line 2"
        
    IF allTracksOccupied:
        ✅ Queue Remaining Trains by Priority
        ACTION: "QUEUE: Train {train4Name} (Priority: {p4}), Train {train5Name} (Priority: {p5})"
        
    // Dynamic Re-allocation
    WHILE anyTrainExiting:
        IF trackBecomesAvailable:
            ✅ Allocate to Next in Priority Queue
            ACTION: "Track {trackId} free - assign to {nextTrainName}"
```

---

## SCENARIO 9: FREIGHT TRAIN TO YARD

```
IF freightTrain.destinationIsYard:

    IF yardLine.isFree:
        ✅ Direct Freight to Yard
        ACTION: "Train {freightName} cleared to Yard via {yardLine}"
        
    ELSE IF yardLine.isOccupied:
        IF freightTrain.canWaitOnLoop:
            ✅ Hold Freight on Loop
            ✅ Wait for Yard Clearance
            ACTION: "HALT train {freightName} on Loop - Yard occupied, will enter after clearance"
            
        ELSE:
            ✅ Hold at Entry Signal
            ACTION: "HALT train {freightName} at entry - Yard not ready"
            
    IF passengerTrain.needsMainLine AND freightTrain.blocksMainLine:
        ✅ Priority to Passenger
        ✅ Freight Diverts to Loop
        ACTION: "REROUTE freight {freightName} to Loop, passenger {passengerName} on Main Line"
```

---

## SCENARIO 10: OPPOSITE DIRECTIONS (UP & DOWN)

```
IF upTrain.approaching AND downTrain.approaching:

    IF upMainLine.isFree AND downMainLine.isFree:
        ✅ Both Use Respective Main Lines
        ACTION: "Train {upName} on UP Main Line, Train {downName} on DOWN Main Line"
        
    ELSE IF upMainLine.isOccupied:
        IF upLoopLine.isFree:
            ✅ UP Train to Loop
            ACTION: "REROUTE UP train {upName} to UP Loop Line"
            
    ELSE IF downMainLine.isOccupied:
        IF downLoopLine.isFree:
            ✅ DOWN Train to Loop
            ACTION: "REROUTE DOWN train {downName} to DOWN Loop Line"
            
    IF bidirectionalSection.required:
        IF upTrain.priority > downTrain.priority:
            ✅ UP Train gets Priority
            ✅ DOWN Train Waits
            ACTION: "HALT DOWN train {downName}, UP train {upName} passes first"
            
        ELSE:
            ✅ DOWN Train gets Priority
            ✅ UP Train Waits
            ACTION: "HALT UP train {upName}, DOWN train {downName} passes first"
```

---

## SCENARIO 11: PLATFORM CONFLICT (MULTIPLE ARRIVALS)

```
IF multipleTrains.needingSamePlatform:

    IF platform.isFree:
        IF train1.priority > train2.priority:
            ✅ High Priority Train to Platform
            ACTION: "Train {train1Name} (Priority: {p1}) to Platform {platformId}"
            
            IF alternatePlatformAvailable:
                ✅ Lower Priority to Alternate
                ACTION: "Train {train2Name} to alternate Platform {altPlatformId}"
                
            ELSE:
                ✅ Lower Priority Waits
                ACTION: "HALT train {train2Name} - wait for Platform {platformId} clearance"
                
    ELSE IF platform.isOccupied:
        IF currentTrain.canExitQuickly (< 2 min):
            ✅ Fast-track Current Train Exit
            ✅ Priority Train Enters Next
            ACTION: "Fast-track exit of {currentName}, {priorityName} enters after clearance"
            
        ELSE IF currentTrain.exitTimeIsLong (> 5 min):
            IF alternatePlatformAvailable:
                ✅ Incoming Train to Alternate
                ACTION: "REROUTE train {incomingName} to Platform {altPlatformId}"
                
            ELSE IF loopLineAvailable:
                ✅ Hold on Loop Until Platform Free
                ACTION: "HALT train {incomingName} on Loop, enter platform after clearance"
```

---

## SCENARIO 12: CASCADING DELAYS

```
IF train1.isDelayed AND causesDelayToTrain2 AND causesDelayToTrain3:

    // Calculate Cascade Impact
    IF train1.delay > criticalThreshold:
        IF train1.priority < train2.priority:
            ✅ Halt Train 1
            ✅ Allow Train 2 to Pass
            ACTION: "HALT train {train1Name} on Loop, pass train {train2Name} (saves {time})"
            
        ELSE IF allTrainsEqual Priority:
            ✅ Queue Management
            ✅ FIFO with Minimum Delay
            ACTION: "Queue trains in arrival order, minimize total delay"
            
    ELSE IF canRecoverDelay:
        ✅ Allow Delayed Train to Continue
        ✅ Other Trains Adjust Speed
        ACTION: "Train {train1Name} continues, {train2Name} and {train3Name} adjust speed"
        
    ELSE IF delayIsUnavoidable:
        ✅ Re-route Lower Priority Trains
        ✅ Maximize Network Throughput
        ACTION: "REROUTE {lowPriorityTrains} to loops, maintain main line for high priority"
```

---

## SCENARIO 13: TRACK MAINTENANCE SCHEDULED

```
IF track.maintenanceScheduled:

    IF maintenanceOn(mainLine):
        ✅ All Traffic to Loop Lines
        ACTION: "Main Line maintenance - all trains to Loop 1 and Loop 2"
        
        IF loopCapacity.isInsufficient:
            ✅ Reduce Train Frequency
            ✅ Hold Trains at Previous Station
            ACTION: "HOLD trains at {previousStation} - reduced capacity during maintenance"
            
    ELSE IF maintenanceOn(loopLine1):
        ✅ Main Line for High Priority
        ✅ Loop 2 for Others
        ACTION: "Loop 1 maintenance - High priority on Main, others on Loop 2"
        
    ELSE IF maintenanceOn(allLoops):
        ✅ Main Line Single Track Operation
        ✅ Strict Priority Queue
        ACTION: "All loops under maintenance - Main Line only, strict priority order"
```

---

## SCENARIO 14: WEATHER EMERGENCY (REDUCED VISIBILITY)

```
IF weather.visibility < safeThreshold OR heavyRain:

    ✅ Reduce All Train Speeds by 40%
    ✅ Increase Signal Braking Distance
    ACTION: "Weather advisory - all trains reduce speed to {reducedSpeed} km/h"
    
    IF mainLine.speedLimit > 100:
        ✅ Divert Fast Trains to Safer Routes
        ACTION: "REROUTE high-speed trains to Loop Lines (safer in low visibility)"
        
    IF conditions.critical:
        ✅ Hold All Non-Essential Trains
        ✅ Only Emergency Trains Proceed
        ACTION: "HALT all non-essential trains - critical weather conditions"
```

---

## SCENARIO 15: VIP TRAIN SPECIAL HANDLING

```
IF vipTrain.isApproaching:

    ✅ Clear All Tracks 10 Minutes Before Arrival
    ACTION: "VIP train {vipName} - clear all tracks, hold regular traffic"
    
    IF regularTrain.onMainLine:
        ✅ Move to Loop Immediately
        ACTION: "EMERGENCY REROUTE: {regularName} to Loop - VIP train approaching"
        
    ✅ Main Line Reserved Exclusively
    ✅ No Parallel Movements
    ACTION: "Main Line reserved for VIP train {vipName}, no parallel movements"
    
    IF vipTrain.requiresSpecificPlatform:
        ✅ Clear and Secure Platform
        ACTION: "Platform {platformId} cleared and secured for VIP train {vipName}"
```

---

## SCENARIO 16: NIGHT TIME OPERATIONS (REDUCED STAFF)

```
IF time.isBetween(22:00, 06:00) AND staff.isReduced:

    ✅ Limit Simultaneous Operations to 2 Trains Max
    ACTION: "Night operations - max 2 trains in station simultaneously"
    
    IF trainCount > 2:
        ✅ Queue Additional Trains at Previous Station
        ACTION: "HOLD trains at {previousStation} - night time capacity limit"
        
    ✅ Main Line Preferred for All Movements
    ✅ Loop Lines Only if Essential
    ACTION: "Night routing - main line preferred, loops only if necessary"
```

---

## SCENARIO 17: POWER FAILURE (SIGNAL SYSTEM DOWN)

```
IF signalSystem.powerFailed:

    ✅ Immediate HALT All Approaching Trains
    ACTION: "EMERGENCY HALT - signal system power failure, all trains stop"
    
    IF backupPower.available:
        ✅ Switch to Manual Signal Operation
        ✅ Reduced Throughput
        ACTION: "Manual signal operation - trains proceed at reduced speed with verbal clearance"
        
    ELSE IF noPowerRestoration:
        ✅ Pilot Train System
        ✅ One Train at a Time
        ACTION: "Pilot train operation - single train through station with pilot escort"
```

---

## SCENARIO 18: PASSENGER EMERGENCY ON PLATFORM

```
IF passengerEmergency.onPlatform:

    ✅ Hold Train at Platform (Do Not Depart)
    ACTION: "HOLD train {trainName} - passenger emergency, do not depart"
    
    IF incomingTrain.approaching:
        ✅ Reroute to Alternate Platform
        ACTION: "REROUTE incoming train {incomingName} to Platform {altPlatformId}"
        
    ELSE IF noAlternatePlatform:
        ✅ Hold Incoming Train at Signal
        ACTION: "HALT train {incomingName} at signal - platform occupied by emergency"
        
    ✅ Clear Platform for Medical Access
    ACTION: "Platform {platformId} cleared for medical emergency response"
```

---

## SCENARIO 19: TRAIN BREAKDOWN ON MAIN LINE

```
IF train.brokenDown.onMainLine:

    ✅ Immediate Blockage Alert
    ACTION: "EMERGENCY: Train {brokenTrain} broken down on Main Line at {location}"
    
    IF rescueTrain.canAssist:
        ✅ Clear Loop Line for Rescue
        ✅ Reroute All Traffic to Other Loop
        ACTION: "Loop 1 cleared for rescue train, all traffic to Loop 2"
        
    IF brokenTrain.canBePushed:
        ✅ Push to Nearest Loop or Yard
        ACTION: "Push train {brokenTrain} to {nearestLoop} for repairs"
        
    ELSE IF cannotMove:
        ✅ Main Line Blocked Indefinitely
        ✅ All Traffic to Loops
        ACTION: "Main Line BLOCKED - all trains to Loop Lines until recovery"
```

---

## SCENARIO 20: COORDINATION WITH ADJACENT STATIONS

```
IF previousStation.signals.trainApproaching:

    ✅ Pre-allocate Track Based on Train Priority
    ACTION: "Pre-allocate {trackType} for incoming train {trainName}"
    
    IF currentStation.isFull:
        ✅ Signal Previous Station to HOLD
        ACTION: "Signal to {previousStation}: HOLD train {trainName} - station at capacity"
        
    IF nextStation.signals.readyToReceive:
        ✅ Fast-track Departure
        ACTION: "Fast-track departure of train {departingName} - next station ready"
        
    ELSE IF nextStation.isFull:
        ✅ Hold at Current Station
        ACTION: "HOLD train {trainName} at current platform - next station at capacity"
```

---

## SUMMARY: DECISION TREE HIERARCHY

```
Level 1: Train Detection
    └─→ Count, Priority, Type, Status

Level 2: Track Availability
    └─→ Main Line, Loop 1, Loop 2, Yard, Platform Status

Level 3: Priority Assessment
    └─→ Emergency > VIP > Superfast > Express > Passenger > Freight

Level 4: Conflict Resolution
    └─→ Reroute / Halt / Wait / Expedite Exit / Queue

Level 5: Action Execution
    └─→ Clear Commands to Trains and Signals

Level 6: Monitoring
    └─→ Real-time Status Updates and Adjustments
```

---

**Total Scenarios Covered:** 20  
**Decision Points:** 150+  
**Possible Outcomes:** 300+

All scenarios follow the IF-ELSE decision tree structure with clear action statements for Vidisha station train management system.
