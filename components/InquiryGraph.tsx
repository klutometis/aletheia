'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { InquiryComplex, QuestionId } from '@/types/inquiry';

interface InquiryGraphProps {
  complex: InquiryComplex;
  answeredQuestions?: Set<QuestionId>;
}

export function InquiryGraph({ 
  complex, 
  answeredQuestions = new Set()
}: InquiryGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Build elements
    const elements = [
      // Nodes
      ...complex.questions.map(q => ({
        data: { 
          id: q.id, 
          label: q.text,
          importance: q.importance,
          answered: answeredQuestions.has(q.id)
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
              if (ele.data('answered')) return '#3b82f6'; // Blue for answered
              return '#e5e7eb'; // Lighter gray for unanswered
            },
            'width': (ele: any) => 30 + ele.data('importance') * 20,
            'height': (ele: any) => 30 + ele.data('importance') * 20,
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 12,
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'color': (ele: any) => {
              if (ele.data('answered')) return '#fff'; // White text for blue nodes
              return '#000'; // Black text for light gray nodes
            },
            'text-background-color': (ele: any) => {
              if (ele.data('answered')) return '#1e40af'; // Darker blue background
              return '#fff'; // White background for unanswered
            },
            'text-background-opacity': 0.8,
            'text-background-padding': '4px',
            'border-width': 2,
            'border-color': '#374151',
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
        nodeSpacing: 10,
        padding: 50,
      }
    });

    cyRef.current = cy;

    // Node interaction disabled - chat-driven interface
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id() as QuestionId;
      const question = complex.questions.find(q => q.id === nodeId);
      if (question) {
        // Could show tooltip or question text
        console.log('Node clicked:', question.text);
      }
    });

    // Fit to view
    cy.fit();

    return () => {
      cy.destroy();
    };
  }, [complex, answeredQuestions]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[600px] border border-gray-300 rounded-lg bg-white"
    />
  );
}
