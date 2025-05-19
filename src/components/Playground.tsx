import React, { useState, useRef } from 'react';
import './Playground.css';

const GATE_TYPES = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'] as const;
type GateType = typeof GATE_TYPES[number];

const INPUT_VALUES = ['0', '1', 'BULB'] as const;
type InputValue = typeof INPUT_VALUES[number];

interface Gate {
  id: number;
  type: GateType;
  x: number;
  y: number;
  value: number;
}

interface Input {
  id: number;
  value: InputValue;
  x: number;
  y: number;
  numericValue: number;
}

interface Circle {
  id: number;
  parentId: number;
  parentType: 'gate' | 'input';
  position: 'input' | 'output';
  x: number;
  y: number;
}

interface Wire {
  id: number;
  startCircleId: number;
  endCircleId: number | null;
  endX?: number;  // Optional for active wire drawing
  endY?: number;  // Optional for active wire drawing
}

const GATE_WIDTH = 100;
const GATE_HEIGHT = 60;
const INPUT_WIDTH = 60;
const INPUT_HEIGHT = 40;

const Playground: React.FC = () => {
  const [gates, setGates] = useState<Gate[]>([]);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [activeWire, setActiveWire] = useState<Wire | null>(null);
  const [draggingGate, setDraggingGate] = useState<null | {
    id: number;
    offsetX: number;
    offsetY: number;
  }>(null);
  const [draggingInput, setDraggingInput] = useState<null | {
    id: number;
    offsetX: number;
    offsetY: number;
  }>(null);
  const [draggingNewGate, setDraggingNewGate] = useState<null | {
    type: GateType;
    mouseX: number;
    mouseY: number;
  }>(null);
  const [draggingNewInput, setDraggingNewInput] = useState<null | {
    value: InputValue;
    mouseX: number;
    mouseY: number;
  }>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'gate' | 'input';
    id: number;
    isOutputCircle?: boolean;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  let gateId = useRef(1);
  let inputId = useRef(1);
  let wireId = useRef(1);
  let circleId = useRef(1);
  const [tempWires, setTempWires] = useState<Wire[]>([]);

  const handleSidebarMouseDown = (type: GateType, e: React.MouseEvent) => {
    setDraggingNewGate({
      type,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  };

  const handleInputSidebarMouseDown = (value: InputValue, e: React.MouseEvent) => {
    setDraggingNewInput({
      value,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  };

  const handleSidebarMouseMove = (e: MouseEvent) => {
    if (draggingNewGate) {
      setDraggingNewGate({
        ...draggingNewGate,
        mouseX: e.clientX,
        mouseY: e.clientY,
      });
    }
    if (draggingNewInput) {
      setDraggingNewInput({
        ...draggingNewInput,
        mouseX: e.clientX,
        mouseY: e.clientY,
      });
    }
  };

  const handleSidebarMouseUp = (e: MouseEvent) => {
    if (draggingNewGate && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - GATE_WIDTH / 2;
      const y = e.clientY - rect.top - GATE_HEIGHT / 2;

      const newGate = {
        id: gateId.current++,
        type: draggingNewGate.type,
        x,
        y,
        value: NaN
      };
      setGates(prev => [...prev, newGate]);
      addCirclesForGate(newGate.id, x, y);
    }
    if (draggingNewInput && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - INPUT_WIDTH / 2;
      const y = e.clientY - rect.top - INPUT_HEIGHT / 2;

      // Set numeric value based on input type
      let numericValue: number;
      if (draggingNewInput.value === 'BULB') {
        numericValue = NaN;
      } else {
        numericValue = draggingNewInput.value === '1' ? 1 : 0;
      }

      const newInput = {
        id: inputId.current++,
        value: draggingNewInput.value,
        x,
        y,
        numericValue
      };
      setInputs(prev => [...prev, newInput]);
      addCircleForInput(newInput.id, x, y, newInput.value);
    }
    setDraggingNewGate(null);
    setDraggingNewInput(null);
  };

  const handleGateMouseDown = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const gate = gates.find((g) => g.id === id);
    if (!gate || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Store wires connected to this gate
    const connectedWires = wires.filter(w => {
      const startCircle = circles.find(c => c.id === w.startCircleId);
      const endCircle = w.endCircleId ? circles.find(c => c.id === w.endCircleId) : null;
      return (startCircle?.parentId === id || endCircle?.parentId === id);
    });
    
    // Remove connected wires temporarily
    setWires(wires => wires.filter(w => !connectedWires.some(cw => cw.id === w.id)));
    setTempWires(connectedWires);
    
    setDraggingGate({
      id,
      offsetX: e.clientX - rect.left - gate.x,
      offsetY: e.clientY - rect.top - gate.y,
    });
  };

  const handleGateMouseMove = (e: MouseEvent) => {
    if (draggingGate && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - draggingGate.offsetX;
      const y = e.clientY - rect.top - draggingGate.offsetY;
      
      setGates(gates => gates.map(g => g.id === draggingGate.id ? { ...g, x, y } : g));
      
      // Update circle positions
      setCircles(circles => circles.map(circle => {
        if (circle.parentId === draggingGate.id && circle.parentType === 'gate') {
          if (circle.position === 'input') {
            // Calculate input circle positions based on their index
            const inputCircles = circles.filter(c => 
              c.parentId === draggingGate.id && 
              c.parentType === 'gate' && 
              c.position === 'input'
            );
            const index = inputCircles.findIndex(c => c.id === circle.id);
            return {
              ...circle,
              x: x - 10,
              y: y + (index === 0 ? GATE_HEIGHT * 0.1 : GATE_HEIGHT * 0.65) // Moved even higher
            };
          } else {
            return {
              ...circle,
              x: x + GATE_WIDTH,
              y: y + GATE_HEIGHT / 2
            };
          }
        }
        return circle;
      }));

      // Update active wire if it's connected to this gate
      if (activeWire) {
        const startCircle = circles.find(c => c.id === activeWire.startCircleId);
        if (startCircle && startCircle.parentId === draggingGate.id) {
          setActiveWire({
            ...activeWire,
            endX: e.clientX - rect.left,
            endY: e.clientY - rect.top
          });
        }
      }
    }
  };

  const handleGateMouseUp = () => {
    if (draggingGate) {
      // Restore wires
      setWires(wires => [...wires, ...tempWires]);
      setTempWires([]);
    }
    setDraggingGate(null);
  };

  const handleInputMouseDown = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const input = inputs.find((i) => i.id === id);
    if (!input || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Store wires connected to this input
    const connectedWires = wires.filter(w => {
      const startCircle = circles.find(c => c.id === w.startCircleId);
      const endCircle = w.endCircleId ? circles.find(c => c.id === w.endCircleId) : null;
      return (startCircle?.parentId === id || endCircle?.parentId === id);
    });
    
    // Remove connected wires temporarily
    setWires(wires => wires.filter(w => !connectedWires.some(cw => cw.id === w.id)));
    setTempWires(connectedWires);
    
    setDraggingInput({
      id,
      offsetX: e.clientX - rect.left - input.x,
      offsetY: e.clientY - rect.top - input.y,
    });
  };

  const handleInputMouseMove = (e: MouseEvent) => {
    if (draggingInput && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - draggingInput.offsetX;
      const y = e.clientY - rect.top - draggingInput.offsetY;
      
      setInputs(inputs => inputs.map(i => i.id === draggingInput.id ? { ...i, x, y } : i));
      
      // Update circle positions
      setCircles(circles => circles.map(circle => {
        if (circle.parentId === draggingInput.id && circle.parentType === 'input') {
          const input = inputs.find(i => i.id === draggingInput.id);
          if (!input) return circle;
          
          if (input.value === 'BULB') {
            return {
              ...circle,
              x: x + 32,
              y: y + 32
            };
          } else {
            return {
              ...circle,
              x: x + INPUT_WIDTH,
              y: y + INPUT_HEIGHT / 2
            };
          }
        }
        return circle;
      }));

      // Update active wire if it's connected to this input
      if (activeWire) {
        const startCircle = circles.find(c => c.id === activeWire.startCircleId);
        if (startCircle && startCircle.parentId === draggingInput.id) {
          setActiveWire({
            ...activeWire,
            endX: e.clientX - rect.left,
            endY: e.clientY - rect.top
          });
        }
      }
    }
  };

  const handleInputMouseUp = () => {
    if (draggingInput) {
      // Restore wires
      setWires(wires => [...wires, ...tempWires]);
      setTempWires([]);
    }
    setDraggingInput(null);
  };

  const handleCircleClick = (e: React.MouseEvent, circleId: number) => {
    e.stopPropagation();
    
    if (activeWire) {
      // Get the target circle and its parent
      const targetCircle = circles.find(c => c.id === circleId);
      const startCircle = circles.find(c => c.id === activeWire.startCircleId);
      
      if (startCircle && targetCircle) {
        // Check if trying to connect 0/1 input to a gate output
        const startInput = inputs.find(i => i.id === startCircle.parentId);
        const isStartInput01 = startInput && (startInput.value === '0' || startInput.value === '1');
        const isTargetGateOutput = targetCircle.parentType === 'gate' && targetCircle.position === 'output';
        
        // Check if trying to connect gate output to another gate output
        const isStartGateOutput = startCircle.parentType === 'gate' && startCircle.position === 'output';
        const isOutputToOutput = isStartGateOutput && isTargetGateOutput;

        // Check if target circle already has a connection (only for non-0/1 inputs)
        const existingConnection = wires.find(w => w.endCircleId === circleId);
        const targetInput = inputs.find(i => i.id === targetCircle.parentId);
        const isTargetInput01 = targetInput && (targetInput.value === '0' || targetInput.value === '1');
        
        if (existingConnection && !isTargetInput01) {
          // Remove the existing wire only if target is not a 0/1 input
          setWires(wires => wires.filter(w => w.id !== existingConnection.id));
        }
        
        if ((isStartInput01 && isTargetGateOutput) || isOutputToOutput) {
          // Don't allow connection
          setWires(wires => wires.filter(w => w.id !== activeWire.id));
          setActiveWire(null);
          return;
        }

        // Complete the wire connection
        setWires(wires => wires.map(w => 
          w.id === activeWire.id 
            ? { ...w, endCircleId: circleId }
            : w
        ));
        setActiveWire(null);

        // Update gate values after new connection
        setTimeout(updateGateValues, 0);
      }
    } else {
      // Check if this circle already has a connection (only for non-0/1 inputs)
      const existingConnection = wires.find(w => w.startCircleId === circleId);
      const startCircle = circles.find(c => c.id === circleId);
      const startInput = startCircle ? inputs.find(i => i.id === startCircle.parentId) : null;
      const isStartInput01 = startInput && (startInput.value === '0' || startInput.value === '1');
      
      if (existingConnection && !isStartInput01) {
        // Remove the existing wire only if starting point is not a 0/1 input
        setWires(wires => wires.filter(w => w.id !== existingConnection.id));
        // Update gate values after removing connection
        setTimeout(updateGateValues, 0);
      }
      
      // Start a new wire
      const newWire: Wire = {
        id: wireId.current++,
        startCircleId: circleId,
        endCircleId: null
      };
      setWires(wires => [...wires, newWire]);
      setActiveWire(newWire);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (activeWire && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setWires(wires => wires.map(w => 
        w.id === activeWire.id 
          ? { ...w, endX: x, endY: y }
          : w
      ));
    }
  };

  const handleMouseUp = () => {
    if (activeWire) {
      // Remove incomplete wire
      setWires(wires => wires.filter(w => w.id !== activeWire.id));
      setActiveWire(null);
    }
  };

  const handleClearCanvas = () => {
    setGates([]);
    setInputs([]);
    setCircles([]);
    setWires([]);
    setActiveWire(null);
    gateId.current = 1;
    inputId.current = 1;
    wireId.current = 1;
    circleId.current = 1;
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'gate' | 'input', id: number, isOutputCircle?: boolean) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      id,
      isOutputCircle
    });
  };

  const handleDeleteItem = () => {
    if (!contextMenu) return;

    if (contextMenu.type === 'gate') {
      // Get all circles associated with this gate
      const gateCircles = circles.filter(c => c.parentId === contextMenu.id && c.parentType === 'gate');
      
      // Remove wires connected to any of these circles
      setWires(wires => wires.filter(w => 
        !gateCircles.some(c => w.startCircleId === c.id || w.endCircleId === c.id)
      ));
      
      // Remove the gate and its circles
      setGates(gates => gates.filter(g => g.id !== contextMenu.id));
      setCircles(circles => circles.filter(c => c.parentId !== contextMenu.id || c.parentType !== 'gate'));
    } else {
      // Get the circle associated with this input
      const inputCircle = circles.find(c => c.parentId === contextMenu.id && c.parentType === 'input');
      
      // Remove wires connected to this circle
      if (inputCircle) {
        setWires(wires => wires.filter(w => 
          w.startCircleId !== inputCircle.id && w.endCircleId !== inputCircle.id
        ));
      }
      
      // Remove the input and its circle
      setInputs(inputs => inputs.filter(i => i.id !== contextMenu.id));
      setCircles(circles => circles.filter(c => c.parentId !== contextMenu.id || c.parentType !== 'input'));
    }
    
    // Update gate values after removing connections
    setTimeout(updateGateValues, 0);
    setContextMenu(null);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (contextMenu) {
      setContextMenu(null);
    }
  };

  const addCirclesForGate = (gateId: number, x: number, y: number) => {
    const newCircles: Circle[] = [
      {
        id: circleId.current++,
        parentId: gateId,
        parentType: 'gate',
        position: 'input',
        x: x,
        y: y + GATE_HEIGHT * 0.1  // Moved even higher
      },
      {
        id: circleId.current++,
        parentId: gateId,
        parentType: 'gate',
        position: 'input',
        x: x,
        y: y + GATE_HEIGHT * 0.65  // Moved even higher
      },
      {
        id: circleId.current++,
        parentId: gateId,
        parentType: 'gate',
        position: 'output',
        x: x + GATE_WIDTH,
        y: y + GATE_HEIGHT / 2
      }
    ];
    setCircles(prev => [...prev, ...newCircles]);
    return newCircles;
  };

  const addCircleForInput = (inputId: number, x: number, y: number, value: InputValue) => {
    const newCircle: Circle = {
      id: circleId.current++,
      parentId: inputId,
      parentType: 'input',
      position: value === 'BULB' ? 'output' : 'output',
      x: value === 'BULB' ? x + 32 : x + INPUT_WIDTH,
      y: value === 'BULB' ? y + 32 : y + INPUT_HEIGHT / 2
    };
    setCircles(prev => [...prev, newCircle]);
    return newCircle;
  };

  // Helper function to get connected object name and value
  const getConnectedObjectInfo = (circleId: number): { name: string, value: string } => {
    const wire = wires.find(w => w.startCircleId === circleId || w.endCircleId === circleId);
    if (!wire) return { name: 'None', value: 'NaN' };
    
    const connectedCircleId = wire.startCircleId === circleId ? wire.endCircleId : wire.startCircleId;
    if (!connectedCircleId) return { name: 'None', value: 'NaN' };
    
    const connectedCircle = circles.find(c => c.id === connectedCircleId);
    if (!connectedCircle) return { name: 'None', value: 'NaN' };
    
    if (connectedCircle.parentType === 'gate') {
      const gate = gates.find(g => g.id === connectedCircle.parentId);
      if (!gate) return { name: 'None', value: 'NaN' };
      const value = calculateGateValue(gate.id);
      return { 
        name: `${gate.type} ${connectedCircle.position}`, 
        value: isNaN(value) ? 'NaN' : value.toString()
      };
    } else {
      const input = inputs.find(i => i.id === connectedCircle.parentId);
      if (!input) return { name: 'None', value: 'NaN' };
      return { 
        name: `${input.value} ${connectedCircle.position}`,
        value: input.value === '0' || input.value === '1' ? input.value : (input.numericValue?.toString() ?? 'NaN')
      };
    }
  };

  // Helper function to get all connections for a gate
  const getGateConnections = (gateId: number): { upper: { name: string, value: string }, lower: { name: string, value: string } } => {
    const gateCircles = circles.filter(c => c.parentId === gateId && c.parentType === 'gate' && c.position === 'input');
    const upperCircle = gateCircles[0];
    const lowerCircle = gateCircles[1];
    
    return {
      upper: upperCircle ? getConnectedObjectInfo(upperCircle.id) : { name: 'None', value: 'NaN' },
      lower: lowerCircle ? getConnectedObjectInfo(lowerCircle.id) : { name: 'None', value: 'NaN' }
    };
  };

  const handleRemoveConnection = (circleId: number) => {
    const wire = wires.find(w => w.startCircleId === circleId || w.endCircleId === circleId);
    if (wire) {
      setWires(wires => wires.filter(w => w.id !== wire.id));
      // Update gate values after removing connection
      setTimeout(updateGateValues, 0);
    }
  };

  // Function to calculate gate value based on inputs and type
  const calculateGateValue = (gateId: number): number => {
    const gate = gates.find(g => g.id === gateId);
    if (!gate) return NaN;

    // Get input circles for this gate
    const inputCircles = circles.filter(c => 
      c.parentId === gateId && 
      c.parentType === 'gate' && 
      c.position === 'input'
    );

    // Get values from input connections
    const input1Value = getInputValue(inputCircles[0]?.id ?? -1);
    const input2Value = getInputValue(inputCircles[1]?.id ?? -1);

    // For NOT gate, only use the first input
    if (gate.type === 'NOT') {
      if (isNaN(input1Value)) return NaN;
      return input1Value ? 0 : 1;
    }

    // For other gates, both inputs must be valid
    if (isNaN(input1Value) || isNaN(input2Value)) return NaN;

    // Calculate output based on gate type
    switch (gate.type) {
      case 'AND':
        return input1Value && input2Value ? 1 : 0;
      case 'OR':
        return input1Value || input2Value ? 1 : 0;
      case 'NAND':
        return !(input1Value && input2Value) ? 1 : 0;
      case 'NOR':
        return !(input1Value || input2Value) ? 1 : 0;
      case 'XOR':
        return (input1Value !== input2Value) ? 1 : 0;
      default:
        return NaN;
    }
  };

  // Helper function to get input value from a circle
  const getInputValue = (circleId: number): number => {
    const wire = wires.find(w => w.endCircleId === circleId);
    if (!wire) return NaN;
    
    const startCircle = circles.find(c => c.id === wire.startCircleId);
    if (!startCircle) return NaN;
    
    if (startCircle.parentType === 'input') {
      const input = inputs.find(i => i.id === startCircle.parentId);
      if (!input) return NaN;
      return input.value === '1' ? 1 : input.value === '0' ? 0 : NaN;
    } else if (startCircle.parentType === 'gate') {
      const gate = gates.find(g => g.id === startCircle.parentId);
      if (!gate) return NaN;
      return calculateGateValue(gate.id);
    }
    
    return NaN;
  };

  // Function to update all gate values
  const updateGateValues = () => {
    // Update all gate values
    setGates(gates => gates.map(gate => ({
      ...gate,
      value: calculateGateValue(gate.id)
    })));
  };

  // Update useEffect to include value updates when inputs change
  React.useEffect(() => {
    setTimeout(updateGateValues, 0);
  }, [inputs, wires]);

  // Update useEffect to include input drag handlers
  React.useEffect(() => {
    if (draggingNewGate || draggingGate) {
      document.addEventListener('mousemove', draggingNewGate ? handleSidebarMouseMove : handleGateMouseMove);
      document.addEventListener('mouseup', draggingNewGate ? handleSidebarMouseUp : handleGateMouseUp);
    }
    if (draggingNewInput || draggingInput) {
      document.addEventListener('mousemove', draggingNewInput ? handleSidebarMouseMove : handleInputMouseMove);
      document.addEventListener('mouseup', draggingNewInput ? handleSidebarMouseUp : handleInputMouseUp);
    }
    if (activeWire) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('mousemove', handleSidebarMouseMove);
      document.removeEventListener('mousemove', handleGateMouseMove);
      document.removeEventListener('mousemove', handleInputMouseMove);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleSidebarMouseUp);
      document.removeEventListener('mouseup', handleGateMouseUp);
      document.removeEventListener('mouseup', handleInputMouseUp);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [draggingNewGate, draggingGate, draggingNewInput, draggingInput, activeWire, contextMenu]);

  const renderGate = (gate: Gate) => {
    const gateCircles = circles.filter(c => c.parentId === gate.id && c.parentType === 'gate');
    const isDragging = draggingGate?.id === gate.id;

    return (
      <div
        key={gate.id}
        className={`gate ${gate.type.toLowerCase()}`}
        style={{
          position: 'absolute',
          left: gate.x,
          top: gate.y,
          width: GATE_WIDTH,
          height: GATE_HEIGHT,
          cursor: 'move',
          zIndex: isDragging ? 2 : 1,
        }}
        onMouseDown={(e) => handleGateMouseDown(gate.id, e)}
        onContextMenu={(e) => handleContextMenu(e, 'gate', gate.id)}
      >
        <div className="gate-body">
          <div className="gate-symbol">{gate.type}</div>
        </div>
        <div className="gate-inputs">
          {gateCircles.filter(c => c.position === 'input').map(circle => (
            <div 
              key={circle.id}
              className="input-circle" 
              style={{ top: `${(circle.y - gate.y) / GATE_HEIGHT * 100}%` }}
              onClick={(e) => handleCircleClick(e, circle.id)}
            />
          ))}
        </div>
        {gateCircles.find(c => c.position === 'output') && (
          <div 
            className="gate-output-circle"
            onClick={(e) => handleCircleClick(e, gateCircles.find(c => c.position === 'output')!.id)}
            onContextMenu={(e) => handleContextMenu(e, 'gate', gate.id, true)}
          />
        )}
      </div>
    );
  };

  const renderInput = (input: Input) => {
    const inputCircle = circles.find(c => c.parentId === input.id && c.parentType === 'input');
    const isDragging = draggingInput?.id === input.id;
    const isBulb = input.value === 'BULB';
    
    if (!inputCircle) return null;

    // Calculate bulb value based on incoming connections
    const bulbValue = isBulb ? (() => {
      const connectedWire = wires.find(w => w.endCircleId === inputCircle.id);
      if (!connectedWire) return 0;
      
      const startCircle = circles.find(c => c.id === connectedWire.startCircleId);
      if (!startCircle) return 0;
      
      if (startCircle.parentType === 'input') {
        const startInput = inputs.find(i => i.id === startCircle.parentId);
        if (!startInput) return 0;
        return startInput.value === '1' ? 1 : 0;
      } else if (startCircle.parentType === 'gate') {
        const gate = gates.find(g => g.id === startCircle.parentId);
        if (!gate) return 0;
        const gateValue = calculateGateValue(gate.id);
        return isNaN(gateValue) ? 0 : gateValue;
      }
      return 0;
    })() : 0;

    return (
      <div
        key={input.id}
        className={`input-value ${isBulb ? 'bulb' : ''}`}
        data-value={input.value}
        style={{
          position: 'absolute',
          left: input.x,
          top: input.y,
          width: isBulb ? 80 : INPUT_WIDTH,
          height: isBulb ? 80 : INPUT_HEIGHT,
          cursor: 'move',
          zIndex: isDragging ? 2 : 1,
        }}
        onMouseDown={(e) => handleInputMouseDown(input.id, e)}
        onContextMenu={(e) => handleContextMenu(e, 'input', input.id)}
      >
        {isBulb ? (
          <>
            <div className="bulb-body">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {bulbValue === 1 ? (
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="#FFD700"/>
                ) : (
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="#2c3e50"/>
                )}
              </svg>
            </div>
            <div 
              className="input-circle"
              onClick={(e) => handleCircleClick(e, inputCircle.id)}
            />
          </>
        ) : (
          <>
            <div className="input-box">
              <div className="input-number">{input.value}</div>
            </div>
            <div 
              className="input-circle"
              onClick={(e) => handleCircleClick(e, inputCircle.id)}
            />
          </>
        )}
      </div>
    );
  };

  const renderWire = (wire: Wire) => {
    const startCircle = circles.find(c => c.id === wire.startCircleId);
    const endCircle = wire.endCircleId ? circles.find(c => c.id === wire.endCircleId) : null;

    if (!startCircle) return null;

    return (
      <svg
        key={wire.id}
        className="wire"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <line
          x1={startCircle.x}
          y1={startCircle.y}
          x2={endCircle ? endCircle.x : (wire.endX || startCircle.x)}
          y2={endCircle ? endCircle.y : (wire.endY || startCircle.y)}
          stroke="#2c3e50"
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <div className="playground-container">
      <div className="gate-palette">
        <h3>Logic Gates</h3>
        <div className="gate-list">
          {GATE_TYPES.map((type) => (
            <div
              key={type}
              className={`gate-item ${type.toLowerCase()}`}
              onMouseDown={(e) => handleSidebarMouseDown(type, e)}
              style={{ userSelect: 'none' }}
            >
              {type}
            </div>
          ))}
        </div>
        <h3 style={{ marginTop: '20px' }}>Objects</h3>
        <div className="input-list">
          {INPUT_VALUES.map((value) => (
            <div
              key={value}
              className={`input-item ${value === 'BULB' ? 'bulb' : ''}`}
              data-value={value}
              onMouseDown={(e) => handleInputSidebarMouseDown(value, e)}
              style={{ userSelect: 'none' }}
            >
              {value === 'BULB' ? (
                <>
                  <div className="bulb-body">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <div className="input-circle" />
                </>
              ) : (
                <div className="input-box">
                  <div className="input-number">{value}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        ref={canvasRef}
        className="canvas"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <button 
          className="clear-button"
          onClick={handleClearCanvas}
        >
          Clear Canvas
        </button>
        {wires.map(renderWire)}
        {gates.map(renderGate)}
        {inputs.map(renderInput)}
        {contextMenu && (
          <div
            className="context-menu"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <div className="context-menu-item">
              {contextMenu.type === 'gate' 
                ? (() => {
                    if (contextMenu.isOutputCircle) {
                      const value = calculateGateValue(contextMenu.id);
                      return `Output value: ${isNaN(value) ? 'NaN' : value}`;
                    }
                    const value = calculateGateValue(contextMenu.id);
                    return `Output value: ${isNaN(value) ? 'NaN' : value}`;
                  })()
                : (() => {
                    const input = inputs.find(i => i.id === contextMenu.id);
                    if (!input) return 'Output value: NaN';
                    if (input.value === '0' || input.value === '1') {
                      return `Output value: ${input.value}`;
                    }
                    return `Output value: ${input.numericValue ?? 'NaN'}`;
                  })()}
            </div>
            {contextMenu.type === 'gate' ? (
              <>
                <div className="context-menu-item connection-item">
                  <span>Upper Input: {getGateConnections(contextMenu.id).upper.name} (Output value: {getGateConnections(contextMenu.id).upper.value})</span>
                  {getGateConnections(contextMenu.id).upper.name !== 'None' && (
                    <div 
                      className="remove-connection"
                      onClick={() => handleRemoveConnection(
                        circles.find(c => 
                          c.parentId === contextMenu.id && 
                          c.parentType === 'gate' && 
                          c.position === 'input'
                        )?.id ?? -1
                      )}
                    />
                  )}
                </div>
                <div className="context-menu-item connection-item">
                  <span>Lower Input: {getGateConnections(contextMenu.id).lower.name} (Output value: {getGateConnections(contextMenu.id).lower.value})</span>
                  {getGateConnections(contextMenu.id).lower.name !== 'None' && (
                    <div 
                      className="remove-connection"
                      onClick={() => handleRemoveConnection(
                        circles.find(c => 
                          c.parentId === contextMenu.id && 
                          c.parentType === 'gate' && 
                          c.position === 'input' &&
                          c.y > (circles.find(c2 => 
                            c2.parentId === contextMenu.id && 
                            c2.parentType === 'gate' && 
                            c2.position === 'input'
                          )?.y ?? 0)
                        )?.id ?? -1
                      )}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="context-menu-item connection-item">
                <span>Connected to: {getConnectedObjectInfo(
                  circles.find(c => 
                    c.parentId === contextMenu.id && 
                    c.parentType === contextMenu.type
                  )?.id ?? -1
                ).name} (Output value: {getConnectedObjectInfo(
                  circles.find(c => 
                    c.parentId === contextMenu.id && 
                    c.parentType === contextMenu.type
                  )?.id ?? -1
                ).value})</span>
                {getConnectedObjectInfo(
                  circles.find(c => 
                    c.parentId === contextMenu.id && 
                    c.parentType === contextMenu.type
                  )?.id ?? -1
                ).name !== 'None' && (
                  <div 
                    className="remove-connection"
                    onClick={() => handleRemoveConnection(
                      circles.find(c => 
                        c.parentId === contextMenu.id && 
                        c.parentType === contextMenu.type
                      )?.id ?? -1
                    )}
                  />
                )}
              </div>
            )}
            <div 
              className="context-menu-item delete"
              onClick={handleDeleteItem}
            >
              Delete
            </div>
          </div>
        )}
        {draggingNewGate && (
          <div
            className={`gate ${draggingNewGate.type.toLowerCase()}`}
            style={{
              position: 'fixed',
              left: draggingNewGate.mouseX - GATE_WIDTH / 2,
              top: draggingNewGate.mouseY - GATE_HEIGHT / 2,
              width: GATE_WIDTH,
              height: GATE_HEIGHT,
              opacity: 0.7,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <div className="gate-body">
              <div className="gate-symbol">{draggingNewGate.type}</div>
            </div>
            <div className="gate-inputs">
              <div className="input-circle" style={{ top: '20%' }} />
              <div className="input-circle" style={{ top: '80%' }} />
            </div>
            <div className="gate-output-circle" />
          </div>
        )}
        {draggingNewInput && (
          <div
            className="input-value"
            style={{
              position: 'fixed',
              left: draggingNewInput.mouseX - INPUT_WIDTH / 2,
              top: draggingNewInput.mouseY - INPUT_HEIGHT / 2,
              width: INPUT_WIDTH,
              height: INPUT_HEIGHT,
              opacity: 0.7,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <div className="input-box">
              <div className="input-number">{draggingNewInput.value}</div>
            </div>
            <div className="input-circle" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Playground;