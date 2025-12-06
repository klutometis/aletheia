'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { InquiryComplex, QuestionId } from '@/types/inquiry';

interface InquiryGraphProps {
  complex: InquiryComplex;
  answeredQuestions?: Set<QuestionId>;
  userAnswers?: Map<QuestionId, any>;
  onNodeClick?: (nodeId: QuestionId) => void;
  selectedNodeId?: QuestionId | null;
  currentQuestionId?: QuestionId | null;
}

export function InquiryGraph({ 
  complex, 
  answeredQuestions = new Set(),
  userAnswers = new Map(),
  onNodeClick,
  selectedNodeId = null,
  currentQuestionId = null
}: InquiryGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // If graph already exists, just update node data
    if (cyRef.current) {
      complex.questions.forEach(q => {
        const node = cyRef.current!.$id(q.id);
        if (node.length > 0) {
          node.data('answered', answeredQuestions.has(q.id));
          node.data('selected', selectedNodeId === q.id);
          
          // Update answer data if available
          const answer = userAnswers.get(q.id);
          if (answer) {
            node.data('confidence', answer.confidence);
          }
        }
      });
      
      // Force style update
      cyRef.current.style().update();
      return;
    }

    // Defer Cytoscape initialization to next event loop tick
    // This ensures React's render cycle and DOM updates are complete
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      // Build elements (first time only)
      const elements = [
      // Nodes
      ...complex.questions.map(q => ({
        data: { 
          id: q.id, 
          label: q.text,
          importance: q.importance,
          answered: answeredQuestions.has(q.id),
          current: q.id === currentQuestionId,
          selected: selectedNodeId === q.id
        }
      })),
      
      // Edges
      ...complex.edges.map((e, idx) => ({
        data: { 
          id: `edge-${idx}`,
          source: e.from, 
          target: e.to, 
          type: e.type,
          weight: e.weight || 1
        }
      }))
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => {
              // Check current FIRST (use node data, not closure variable)
              if (ele.data('current')) return '#f59e0b'; // Amber for current
              if (ele.data('selected')) return '#1d4ed8'; // Darker blue for selected
              if (ele.data('answered')) return '#3b82f6'; // Blue for answered
              return '#e5e7eb'; // Lighter gray for unanswered
            },
            'width': (ele: any) => 50 + ele.data('importance') * 30,
            'height': (ele: any) => 50 + ele.data('importance') * 30,
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 14,
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'color': (ele: any) => {
              if (ele.data('current')) return '#fff'; // White text for amber nodes
              if (ele.data('answered')) return '#fff'; // White text for blue nodes
              return '#000'; // Black text for light gray nodes
            },
            'text-background-color': (ele: any) => {
              if (ele.data('current')) return '#d97706'; // Darker amber background for current
              if (ele.data('answered')) return '#1e40af'; // Darker blue background for answered
              return '#fff'; // White background for unanswered
            },
            'text-background-opacity': 0.8,
            'text-background-padding': '4px',
            'border-width': (ele: any) => ele.data('selected') ? 4 : 2,
            'border-color': (ele: any) => ele.data('selected') ? '#1e40af' : '#374151',
          }
        },
        {
          selector: 'node:hover',
          style: {
            'background-color': '#1f2937',
            'border-width': 3,
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => ele.data('weight') || 1.5,
            'line-color': (ele: any) => {
              if (ele.data('type') === 'tension') return '#ef4444'; // Red
              if (ele.data('type') === 'dependency') return '#3b82f6'; // Blue
              return '#d1d5db'; // Gray for related
            },
            'target-arrow-color': (ele: any) => {
              if (ele.data('type') === 'tension') return '#ef4444';
              if (ele.data('type') === 'dependency') return '#3b82f6';
              return '#d1d5db';
            },
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          }
        },
        {
          selector: 'edge:hover',
          style: {
            'width': 3,
            'line-color': '#000',
          }
        }
      ],
      
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeSpacing: 50,
        padding: 50,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
      }
    });

    cyRef.current = cy;

    // Node click handler
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id() as QuestionId;
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    });

    // Enable zoom and pan
    cy.userZoomingEnabled(true);
    cy.userPanningEnabled(true);
    cy.boxSelectionEnabled(false);

      // Fit to view
      cy.fit();
    }, 0);

    return () => {
      clearTimeout(timer);
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [complex]); // Only recreate if complex changes
  
  // Update node states when answers or selection changes
  useEffect(() => {
    if (!cyRef.current) return;
    
    cyRef.current.batch(() => {
      complex.questions.forEach(q => {
        const node = cyRef.current!.$id(q.id);
        if (node.length > 0) {
          node.data('answered', answeredQuestions.has(q.id));
          node.data('selected', selectedNodeId === q.id);
          node.data('current', q.id === currentQuestionId);
          
          const answer = userAnswers.get(q.id);
          if (answer) {
            node.data('confidence', answer.confidence);
          }
        }
      });
    });
    
    // Force Cytoscape to re-evaluate style functions by updating the stylesheet
    cyRef.current.style()
      .selector('node')
      .style({
        'background-color': (ele: any) => {
          // Check current FIRST (use node data, not closure variable)
          if (ele.data('current')) return '#f59e0b'; // Amber for current
          if (ele.data('selected')) return '#1d4ed8'; // Darker blue for selected
          if (ele.data('answered')) return '#3b82f6'; // Blue for answered
          return '#e5e7eb'; // Lighter gray for unanswered
        }
      })
      .update();
  }, [answeredQuestions, selectedNodeId, userAnswers, complex.questions, currentQuestionId]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border border-gray-300 rounded-lg bg-white"
    />
  );
}
