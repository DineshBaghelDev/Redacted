"use client";

import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  useNodesState,
} from "@xyflow/react";
import { Link2, Plus, Trash2, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type StringColor = "red" | "gold" | "blue" | "green";
type NoteData = {
  text: string;
  onChange: (id: Id<"clueBoardNodes">, text: string) => void;
  onDelete: (id: Id<"clueBoardNodes">) => void;
};
type NoteNode = Node<NoteData, "note">;

const colors: Record<StringColor, { label: string; value: string }> = {
  red: { label: "Red string", value: "#b3342b" },
  gold: { label: "Gold string", value: "#d69a2d" },
  blue: { label: "Blue string", value: "#3979a8" },
  green: { label: "Green string", value: "#4f7d55" },
};

const nodeTypes = { note: NoteCard };

export function ClueBoardScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const savedNodes = useQuery(api.clueBoard.getNodes, { roomCode });
  const savedEdges = useQuery(api.clueBoard.getEdges, { roomCode });
  const createNote = useMutation(api.clueBoard.createNoteNode);
  const updateNode = useMutation(api.clueBoard.updateNode);
  const deleteNode = useMutation(api.clueBoard.deleteNode);
  const createEdge = useMutation(api.clueBoard.createEdge);
  const deleteEdge = useMutation(api.clueBoard.deleteEdge);
  const [stringColor, setStringColor] = useState<StringColor>("red");
  const [selectedEdge, setSelectedEdge] = useState<Id<"clueBoardEdges"> | null>(null);
  const [error, setError] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<NoteNode>([]);

  const showError = useCallback((caught: unknown) => {
    setError(caught instanceof Error ? caught.message : "Could not update the board.");
  }, []);
  const saveText = useCallback((id: Id<"clueBoardNodes">, text: string) => {
    void updateNode({ nodeId: id, text }).catch(showError);
  }, [showError, updateNode]);
  const removeNote = useCallback((id: Id<"clueBoardNodes">) => {
    void deleteNode({ nodeId: id }).catch(showError);
  }, [deleteNode, showError]);

  useEffect(() => {
    if (!savedNodes) return;
    setNodes(savedNodes.map((note) => ({
      id: note._id,
      type: "note",
      position: { x: note.x, y: note.y },
      data: { text: note.text, onChange: saveText, onDelete: removeNote },
    })));
  }, [removeNote, savedNodes, saveText, setNodes]);

  const edges = useMemo<Edge[]>(() => (savedEdges ?? []).map((edge) => ({
    id: edge._id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    style: { stroke: colors[edge.color].value, strokeWidth: 3 },
    className: "clue-string",
  })), [savedEdges]);

  function addNote() {
    const count = savedNodes?.length ?? 0;
    setError("");
    void createNote({
      roomCode,
      text: "New note",
      x: 80 + (count % 4) * 220,
      y: 90 + (Math.floor(count / 4) % 4) * 180,
    }).catch(showError);
  }

  function connect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    setError("");
    void createEdge({
      roomCode,
      sourceNodeId: connection.source as Id<"clueBoardNodes">,
      targetNodeId: connection.target as Id<"clueBoardNodes">,
      color: stringColor,
    }).catch(showError);
  }

  function removeSelectedString() {
    if (!selectedEdge) return;
    void deleteEdge({ edgeId: selectedEdge })
      .then(() => setSelectedEdge(null))
      .catch(showError);
  }

  return (
    <section className="absolute inset-0 z-40 flex flex-col bg-[#15100d] text-[#f4e8c8]" aria-label="Clue board">
      <header className="z-10 flex flex-wrap items-center gap-3 border-b-2 border-[#5e3e29] bg-[#241812] px-4 py-3 shadow-lg">
        <button className="clue-board-button" onClick={onBack} type="button">
          <X aria-hidden="true" size={18} /> Back
        </button>
        <div className="mr-auto">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#c99b63]">Shared case workspace</p>
          <h1 className="text-xl uppercase text-[#fff1c9]">Clueboard</h1>
        </div>
        <button className="clue-board-button" onClick={addNote} type="button">
          <Plus aria-hidden="true" size={18} /> Add note
        </button>
        <div className="flex items-center gap-2" aria-label="String color" role="group">
          <Link2 aria-hidden="true" size={17} />
          {Object.entries(colors).map(([name, color]) => (
            <button
              aria-label={color.label}
              aria-pressed={stringColor === name}
              className="h-7 w-7 border-2 border-[#ead9af] shadow-[2px_2px_0_#080605] transition-transform hover:scale-110 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-[#fff1c9]"
              key={name}
              onClick={() => setStringColor(name as StringColor)}
              style={{ backgroundColor: color.value }}
              type="button"
            />
          ))}
        </div>
        {selectedEdge ? (
          <button className="clue-board-button text-[#ffd3c6]" onClick={removeSelectedString} type="button">
            <Trash2 aria-hidden="true" size={17} /> Remove string
          </button>
        ) : null}
      </header>

      <div className="clue-board relative min-h-0 flex-1">
        <ReactFlow<NoteNode, Edge>
          colorMode="dark"
          connectionLineStyle={{ stroke: colors[stringColor].value, strokeWidth: 3 }}
          connectionMode={ConnectionMode.Loose}
          edges={edges}
          fitView
          minZoom={0.35}
          nodeTypes={nodeTypes}
          nodes={nodes}
          onConnect={connect}
          onEdgeClick={(_, edge) => setSelectedEdge(edge.id as Id<"clueBoardEdges">)}
          onNodeDragStop={(_, node) => {
            void updateNode({
              nodeId: node.id as Id<"clueBoardNodes">,
              x: node.position.x,
              y: node.position.y,
            }).catch(showError);
          }}
          onNodesChange={onNodesChange}
          onPaneClick={() => setSelectedEdge(null)}
        >
          <Background color="#8a6246" gap={28} size={1} />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
        <p className="pointer-events-none absolute bottom-4 left-4 max-w-xs border border-[#69452e] bg-[#1b120e]/90 px-3 py-2 text-xs text-[#e3c997] shadow-md">
          Drag notes to arrange them. Drag from one pin to another to tie a string.
        </p>
        {error ? (
          <p className="absolute left-1/2 top-4 -translate-x-1/2 border border-red-300 bg-red-950/95 px-4 py-2 text-sm text-red-100 shadow-lg" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function NoteCard({ id, data, selected }: NodeProps<NoteNode>) {
  return (
    <article className={`relative w-48 rotate-[-1deg] border border-[#b4a06d] bg-[#eee2bd] p-3 pt-5 text-[#292014] shadow-[5px_6px_9px_rgba(20,10,5,0.45)] ${selected ? "outline-2 outline-[#fff2b6]" : ""}`}>
      <Handle
        className="clue-pin"
        position={Position.Top}
        title="Drag to another pin"
        type="source"
      />
      <textarea
        aria-label="Note text"
        className="nodrag nowheel min-h-24 w-full resize-none bg-transparent text-base leading-5 outline-none placeholder:text-[#725f42]"
        defaultValue={data.text}
        key={data.text}
        maxLength={500}
        onBlur={(event) => {
          if (event.target.value.trim() && event.target.value.trim() !== data.text) data.onChange(id as Id<"clueBoardNodes">, event.target.value);
        }}
      />
      <button
        aria-label="Remove note"
        className="nodrag absolute bottom-1 right-1 p-1 text-[#775d42] hover:text-red-800 focus-visible:outline-2 focus-visible:outline-red-800"
        onClick={() => data.onDelete(id as Id<"clueBoardNodes">)}
        title="Remove note"
        type="button"
      >
        <Trash2 aria-hidden="true" size={15} />
      </button>
    </article>
  );
}
