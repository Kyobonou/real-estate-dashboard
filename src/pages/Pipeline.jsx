
import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, User, Calendar, MapPin, DollarSign, Clock, AlertCircle, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiService from "../services/api";
import pdfService from "../services/pdfService";
import "./Pipeline.css";

const Pipeline = () => {
    // --- STATE ---
    const [columns, setColumns] = useState({
        leads: {
            id: "leads",
            title: "Prospects",
            color: "#6366f1", // Indigo
            items: [],
        },
        scheduled: {
            id: "scheduled",
            title: "Visites Programmées",
            color: "#3b82f6", // Blue
            items: [],
        },
        negotiation: {
            id: "negotiation",
            title: "Offres en cours",
            color: "#f59e0b", // Amber
            items: [],
        },
        closed: {
            id: "closed",
            title: "Signé / Terminé",
            color: "#10b981", // Emerald
            items: [],
        },
    });

    const [loading, setLoading] = useState(true);

    // --- DATA LOADING ---
    useEffect(() => {
        loadPipelineData();
    }, []);

    const loadPipelineData = async () => {
        setLoading(true);
        try {
            const pipelineRes = await apiService.getPipeline();
            if (pipelineRes.success) {
                const initialColumns = { ...columns };

                // Clear existing items
                Object.keys(initialColumns).forEach(key => initialColumns[key].items = []);

                // Distribute items based on their status
                pipelineRes.data.forEach(item => {
                    if (initialColumns[item.status]) {
                        initialColumns[item.status].items.push(item);
                    } else {
                        // Fallback for unknown status
                        initialColumns['leads'].items.push(item);
                    }
                });

                setColumns(initialColumns);
            }
        } catch (error) {
            console.error("Erreur chargement pipeline:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDoc = (e, item) => {
        e.stopPropagation();
        if (item.status === 'negotiation') {
            pdfService.generateOffer(item);
        } else {
            pdfService.generateVisitVoucher(item);
        }
    };

    // --- DRAG & DROP HANDLERS ---
    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId !== destination.droppableId) {
            const sourceColumn = columns[source.droppableId];
            const destColumn = columns[destination.droppableId];
            const sourceItems = [...sourceColumn.items];
            const destItems = [...destColumn.items];
            const [removed] = sourceItems.splice(source.index, 1);

            removed.status = destination.droppableId;

            // Optimistic Update
            destItems.splice(destination.index, 0, removed);
            setColumns({
                ...columns,
                [source.droppableId]: {
                    ...sourceColumn,
                    items: sourceItems,
                },
                [destination.droppableId]: {
                    ...destColumn,
                    items: destItems,
                },
            });

            // Call API
            try {
                await apiService.updatePipelineStatus(draggableId, destination.droppableId);
            } catch (error) {
                console.error("Failed to update status:", error);
                // Revert changes on error (simplified for now)
                loadPipelineData();
            }

        } else {
            const column = columns[source.droppableId];
            const copiedItems = [...column.items];
            const [removed] = copiedItems.splice(source.index, 1);
            copiedItems.splice(destination.index, 0, removed);
            setColumns({
                ...columns,
                [source.droppableId]: {
                    ...column,
                    items: copiedItems,
                },
            });
        }
    };

    // --- RENDER ---
    return (
        <div className="pipeline-container">
            <header className="pipeline-header">
                <div>
                    <h1>Pipeline Commercial</h1>
                    <p>Suivez vos leads de la prospection à la signature</p>
                </div>
                <button className="btn btn-primary">
                    <Plus size={18} />
                    Nouveau Lead
                </button>
            </header>

            <div className="pipeline-board">
                <DragDropContext onDragEnd={onDragEnd}>
                    {Object.entries(columns).map(([columnId, column], index) => {
                        return (
                            <div className="pipeline-column" key={columnId}>
                                <div className="column-header">
                                    <div className="column-title">
                                        <span className="column-dot" style={{ backgroundColor: column.color }}></span>
                                        <h3>{column.title}</h3>
                                        <span className="column-count">{column.items.length}</span>
                                    </div>
                                    <button className="btn-icon-ghost">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>

                                <Droppable droppableId={columnId}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`column-content ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
                                        >
                                            {column.items.map((item, index) => (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`kanban-card ${snapshot.isDragging ? "dragging" : ""}`}
                                                            style={{ ...provided.draggableProps.style }}
                                                        >
                                                            <div className="card-header">
                                                                <span className="lead-name">{item.content}</span>
                                                                {/* Avatar placeholder if needed */}
                                                            </div>

                                                            <div className="card-property">
                                                                <HomeIcon size={12} />
                                                                <span>{item.property}</span>
                                                            </div>

                                                            <div className="card-details">
                                                                <div className="detail-item">
                                                                    <DollarSign size={12} />
                                                                    <span>{item.price}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <Calendar size={12} />
                                                                    <span>{item.date}</span>
                                                                </div>
                                                            </div>

                                                            <div className="card-footer">
                                                                <div className="tags">
                                                                    {item.tags.map((tag, i) => (
                                                                        <span key={i} className="tag">{tag}</span>
                                                                    ))}
                                                                </div>

                                                                <div className="card-actions">
                                                                    {(item.status === 'scheduled' || item.status === 'negotiation') && (
                                                                        <button
                                                                            type="button" // Important pour ne pas submit form par erreur
                                                                            className="icon-btn-small"
                                                                            onClick={(e) => handleGenerateDoc(e, item)}
                                                                            title="Générer Document (PDF)"
                                                                        >
                                                                            <FileText size={14} />
                                                                        </button>
                                                                    )}

                                                                    {/* Time sensitive alert example */}
                                                                    {Math.random() > 0.7 && (
                                                                        <div className="alert-icon" title="Action requise">
                                                                            <AlertCircle size={14} color="#ef4444" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </DragDropContext>
            </div>
        </div>
    );
};

// Simple Icon wrapper for consistency
const HomeIcon = ({ size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
);

export default Pipeline;
