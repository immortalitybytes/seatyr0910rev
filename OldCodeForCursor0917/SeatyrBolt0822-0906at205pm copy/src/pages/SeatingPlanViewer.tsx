import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, ArrowLeft, ArrowRight, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../components/Card';
import { useApp } from '../context/AppContext';
import { generateSeatingPlans } from '../utils/seatingAlgorithm';
import { ValidationError } from '../types';
import SavedSettingsAccordion from '../components/SavedSettingsAccordion';
import { isPremiumSubscription } from '../utils/premium';
import { seatingTokensFromGuestUnit, nOfNTokensFromSuffix } from '../utils/formatters';

const formatGuestNameForSeat = (rawName: string, seatIndex: number): React.ReactNode => {
    if (!rawName) return '';
    
    const originalName = rawName.trim();
    
    // Get base tokens (names) and extra tokens (ordinals)
    const baseTokens = seatingTokensFromGuestUnit(rawName);
    const extraTokens = nOfNTokensFromSuffix(rawName);
    
    // Check if this has addition signifiers with numerals
    const hasAdditionSignifier = /[&+]|\b(?:and|plus)\b/i.test(originalName);
    const hasPlusOne = hasAdditionSignifier &&
                      /(?:(?:\+|&)\s*1(?!\d))|(?:\b(?:and|plus)\b\s*(?:one|1)(?!\d))/i.test(originalName);
    
    // Calculate total seats needed
    const totalSeats = baseTokens.length + extraTokens.length;
    
    // Determine which token to bold based on seat index
    let tokenToBold = '';
    let showOrdinal = false;
    let ordinalToShow = '';
    
    if (seatIndex < baseTokens.length) {
      // Bold one of the base name tokens
      tokenToBold = baseTokens[seatIndex];
    } else {
      // Show ordinal for additional seats
      showOrdinal = true;
      const ordinalIndex = seatIndex - baseTokens.length;
      ordinalToShow = extraTokens[ordinalIndex] || '';
      tokenToBold = ordinalToShow;
    }
    
    // Build the display
    const result: React.ReactNode[] = [];
    
    // For cases with addition signifiers, preserve the full original name structure
    if (hasAdditionSignifier) {
      if (hasPlusOne) {
        // Special case: For "+1", convert to "plus One" format on ALL cells
        const displayName = originalName.replace(
          /(?:(?:\+|&)\s*1(?!\d))|(?:\b(?:and|plus)\b\s*(?:one|1)(?!\d))/gi,
          ' plus One'
        );
        
        if (seatIndex < baseTokens.length) {
          // For base name seats, show the full display name with proper bolding
          const nameToBold = baseTokens[seatIndex];
          const nameIndex = displayName.indexOf(nameToBold);
          
          if (nameIndex !== -1) {
            const beforeName = displayName.substring(0, nameIndex);
            const afterName = displayName.substring(nameIndex + nameToBold.length);
            
            if (beforeName) {
              result.push(<span key="before-name">{beforeName}</span>);
            }
            result.push(<strong key="bold-name">{nameToBold}</strong>);
            if (afterName) {
              result.push(<span key="after-name">{afterName}</span>);
            }
          } else {
            // Fallback: show the full display name
            result.push(<span key="full-name">{displayName}</span>);
          }
        } else {
          // For the "+1" seat, show the full display name with "One" bolded
          const oneIndex = displayName.indexOf('One');
          if (oneIndex !== -1) {
            const beforeOne = displayName.substring(0, oneIndex);
            const afterOne = displayName.substring(oneIndex + 3);
            
            if (beforeOne) {
              result.push(<span key="before-one">{beforeOne}</span>);
            }
            result.push(<strong key="bold-one">One</strong>);
            if (afterOne) {
              result.push(<span key="after-one">{afterOne}</span>);
            }
          } else {
            result.push(<span key="full-name">{displayName}</span>);
          }
        }
      } else {
        // For other addition signifiers (like +2, +3, etc.), preserve the full name with addition signifier
        if (seatIndex < baseTokens.length) {
          // For base name seats, show the full original name with addition signifier
          const nameToBold = baseTokens[seatIndex];
          
          // Find the position of the name to bold in the full name
          const nameIndex = originalName.indexOf(nameToBold);
          if (nameIndex !== -1) {
            const beforeName = originalName.substring(0, nameIndex);
            const afterName = originalName.substring(nameIndex + nameToBold.length);
            
            if (beforeName) {
              result.push(<span key="before-name">{beforeName}</span>);
            }
            result.push(<strong key="bold-name">{nameToBold}</strong>);
            if (afterName) {
              result.push(<span key="after-name">{afterName}</span>);
            }
          } else {
            // Fallback: just show the full name and bold the token
            result.push(<span key="full-name">{originalName}</span>);
          }
        } else {
          // For ordinal seats, show the full name + ordinal
          result.push(<span key="full-name">{originalName}</span>);
          result.push(<span key="ordinal-sep">+ </span>);
          if (ordinalToShow === tokenToBold) {
            const ordinalMatch = ordinalToShow.match(/^(\d+(?:st|nd|rd|th))\s+(of\s+\d+)$/);
            if (ordinalMatch) {
              result.push(<strong key="ordinal-bold">{ordinalMatch[1]}</strong>);
              result.push(<span key="ordinal-of"> {ordinalMatch[2]}</span>);
            } else {
              result.push(<strong key="ordinal-bold">{ordinalToShow}</strong>);
            }
          } else {
            result.push(<span key="ordinal-norm">{ordinalToShow}</span>);
          }
        }
      }
    } else {
      // Original logic for cases without addition signifiers
      baseTokens.forEach((token, index) => {
        if (index > 0) {
          result.push(<span key={`conn-${index}`}> & </span>);
        }
        
        if (token === tokenToBold) {
          result.push(<strong key={`bold-${index}`}>{token}</strong>);
        } else {
          result.push(<span key={`norm-${index}`}>{token}</span>);
        }
      });
      
      if (showOrdinal && ordinalToShow) {
        result.push(<span key="ordinal-sep">+</span>);
        if (ordinalToShow === tokenToBold) {
          const ordinalMatch = ordinalToShow.match(/^(\d+(?:st|nd|rd|th))\s+(of\s+\d+)$/);
          if (ordinalMatch) {
            result.push(<strong key="ordinal-bold">{ordinalMatch[1]}</strong>);
            result.push(<span key="ordinal-of"> {ordinalMatch[2]}</span>);
          } else {
            result.push(<strong key="ordinal-bold">{ordinalToShow}</strong>);
          }
        } else {
          result.push(<span key="ordinal-norm">{ordinalToShow}</span>);
        }
      }
    }
    
    return <>{result}</>;
};

const displayTableLabel = (table: { id: number; name?: string | null }, index: number): string => {
    const displayNumber = index + 1;
    const baseLabel = `Table #${displayNumber}`;
    if (!table.name || table.name.trim() === '' || table.name.trim().toLowerCase() === `table ${displayNumber}`) {
      return baseLabel;
    }
    return `Table #${displayNumber} (${table.name.trim()})`;
};


// Constants for guest pagination (matching Constraints page)
const GUEST_THRESHOLD = 120; // pagination threshold
const GUESTS_PER_PAGE = 10;

const SeatingPlanViewer: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  
  // Guest pagination state (matching Constraints page)
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Get premium status from subscription
  const isPremium = isPremiumSubscription(state.subscription);

  const plan = state.seatingPlans[state.currentPlanIndex] ?? null;

  // Auto-generate seating plan if none exists
  useEffect(() => {
    if (state.seatingPlans.length === 0 && state.guests.length > 0 && state.tables.length > 0) {
      setIsGenerating(true);
      generateSeatingPlans(state.guests, state.tables, state.constraints, state.adjacents, {}, isPremium)
        .then(result => {
          if (result.plans.length > 0) {
            dispatch({ type: 'SET_SEATING_PLANS', payload: result.plans });
          }
        })
        .catch(error => {
          console.error('Auto-generation failed:', error);
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, [state.guests, state.tables, state.constraints, state.adjacents, state.seatingPlans.length, isPremium, dispatch]);

  // Guest pagination logic (matching Constraints page)
  useEffect(() => {
    setCurrentPage(0);
    if (isPremium && state.user && state.guests.length > GUEST_THRESHOLD) {
      setTotalPages(Math.ceil(state.guests.length / GUESTS_PER_PAGE));
    } else {
      setTotalPages(1);
    }
  }, [state.guests, isPremium, state.user]);

  const capacityById = useMemo(() => {
    const map = new Map<number, number>();
    state.tables.forEach(t => map.set(t.id, t.seats));
    return map;
  }, [state.tables]);

  const tablesNormalized = useMemo(() => {
    if (!plan) return [];
    return [...plan.tables].sort((a, b) => a.id - b.id);
  }, [plan]);

  // Navigation functions (matching Constraints page)
  const needsPagination = isPremium && state.user && state.guests.length > GUEST_THRESHOLD;
  const shouldShowPagination = state.guests.length >= GUEST_THRESHOLD;
  const handleNavigatePage = (delta: number) => setCurrentPage(p => Math.max(0, Math.min(totalPages - 1, p + delta)));

  const handleGenerateSeatingPlan = async () => {
      setIsGenerating(true);
      setErrors([]);
      try {
          const { plans, errors: validationErrors } = await generateSeatingPlans(
              state.guests, state.tables, state.constraints, state.adjacents, state.assignments, isPremium
          );
          if (validationErrors.length > 0) setErrors(validationErrors);
          if (plans.length > 0) {
              dispatch({ type: 'SET_SEATING_PLANS', payload: plans });
              dispatch({ type: 'SET_CURRENT_PLAN_INDEX', payload: 0 });
          } else if (validationErrors.length === 0) {
              setErrors([{ type: 'error', message: 'No valid seating plans could be generated. Try relaxing constraints.' }]);
          }
      } catch (e) {
          setErrors([{ type: 'error', message: 'An unexpected error occurred during plan generation.' }]);
      } finally {
          setIsGenerating(false);
      }
  };

  // Render page numbers function (matching Constraints page)
  const renderPageNumbers = () => {
    if (totalPages <= 9) {
      return Array.from({ length: totalPages }, (_, i) => (
        <button key={i} onClick={() => setCurrentPage(i)} className={currentPage === i ? 'danstyle1c-btn selected mx-1 w-4' : 'danstyle1c-btn mx-1 w-4'}>
          {i + 1}
        </button>
      ));
    }
    const buttons: JSX.Element[] = [];
    for (let i = 0; i < 3; i++) if (i < totalPages) buttons.push(
      <button key={i} onClick={() => setCurrentPage(i)} className={currentPage === i ? 'danstyle1c-btn selected mx-1 w-4' : 'danstyle1c-btn mx-1 w-4'}>{i + 1}</button>
    );
    if (currentPage > 2) {
      buttons.push(<span key="ellipsis1" className="mx-1">...</span>);
      if (currentPage < totalPages - 3) buttons.push(
        <button key={currentPage} onClick={() => setCurrentPage(currentPage)} className="danstyle1c-btn selected mx-1 w-4">{currentPage + 1}</button>
      );
    }
    if (currentPage < totalPages - 3) buttons.push(<span key="ellipsis2" className="mx-1">...</span>);
    for (let i = Math.max(3, totalPages - 3); i < totalPages; i++) buttons.push(
      <button key={i} onClick={() => setCurrentPage(i)} className={currentPage === i ? 'danstyle1c-btn selected mx-1 w-4' : 'danstyle1c-btn mx-1 w-4'}>{i + 1}</button>
    );
    return buttons;
  };

  const handleNavigatePlan = (delta: number) => {
    const newIndex = state.currentPlanIndex + delta;
    if (newIndex >= 0 && newIndex < state.seatingPlans.length) {
      dispatch({ type: 'SET_CURRENT_PLAN_INDEX', payload: newIndex });
    }
  };

  const renderCurrentPlan = () => {
    if (!plan) {
      return <div className="text-center py-8 text-gray-500">No seating plan available.</div>;
    }
    
    const maxCapacity = Math.max(0, ...Array.from(capacityById.values()));

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {tablesNormalized.map((table, index) => {
                const capacity = capacityById.get(table.id) ?? 0;
                const occupied = table.seats.length;
                const tableInfo = state.tables.find(t => t.id === table.id);
                return (
                  <th key={table.id} className="bg-indigo-100 text-[#586D78] font-medium p-2 border border-indigo-200">
                    {displayTableLabel({id: table.id, name: tableInfo?.name }, index)}
                    <span className="text-xs block text-gray-600">{occupied}/{capacity} seats</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxCapacity }).map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {tablesNormalized.map(table => {
                  const capacity = capacityById.get(table.id) ?? 0;
                  if (rowIndex >= capacity) {
                    return <td key={`cell-blackout-${table.id}-${rowIndex}`} className="p-2 border border-gray-700 bg-black" aria-hidden="true" style={{ pointerEvents: 'none' }} />;
                  }
                  
                  const guestData = table.seats[rowIndex];
                  if (!guestData) {
                    return <td key={`cell-empty-${table.id}-${rowIndex}`} className="p-2 border border-gray-200 bg-gray-50"><div className="text-xs text-gray-400 text-center">Empty</div></td>;
                  }

                  // Safe type validation (Grok feature)
                  const safeName = (typeof guestData.name === 'string' && guestData.name.trim()) ? guestData.name.trim() : '';
                  const safePartyIndex = Number.isFinite((guestData as any).partyIndex) ? (guestData as any).partyIndex : -1;

                  return (
                    <td key={`cell-guest-${table.id}-${rowIndex}`} className="p-2 border border-indigo-200 align-top">
                      <div className="font-medium text-[#586D78] text-sm">
                        {formatGuestNameForSeat(safeName, safePartyIndex)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
          <h2 className="text-lg font-bold text-[#586D78] mb-4">Seating Plan</h2>
          <p className="text-gray-700">Generate and review seating plans based on your guests, tables, and constraints.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button className="danstyle1c-btn" onClick={handleGenerateSeatingPlan} disabled={isGenerating}>
              {isGenerating && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {isGenerating ? 'Generating...' : 'Generate Seating Plan'}
            </button>
          </div>
          {errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <h3 className="flex items-center text-red-800 font-medium mb-2"><AlertCircle className="w-4 h-4 mr-1" /> Errors</h3>
                  <ul className="list-disc pl-5 text-red-700 text-sm space-y-1">
                      {errors.map((error, index) => (<li key={index}>{error.message}</li>))}
                  </ul>
              </div>
          )}
      </Card>
      <Card title={`Current Plan (${state.currentPlanIndex + 1} of ${state.seatingPlans.length})`}>
        {/* Previous/Next buttons above the grid - right justified */}
        {state.seatingPlans.length > 1 && (
          <div className="flex justify-end space-x-2 mb-4">
            <button
              className="danstyle1c-btn w-32 mx-1"
              onClick={() => handleNavigatePlan(-1)}
              disabled={state.currentPlanIndex <= 0}
            >
              ← Previous
            </button>
            <button
              className="danstyle1c-btn w-24 mx-1"
              onClick={() => handleNavigatePlan(1)}
              disabled={state.currentPlanIndex >= state.seatingPlans.length - 1}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}

        {/* Guest pagination controls - top (matching Constraints page) */}
        {shouldShowPagination && state.user && state.guests.length > 0 && (
          <div className="flex justify-end space-x-2 mb-4">
            <button className="danstyle1c-btn w-24 mx-1" onClick={() => handleNavigatePage(-1)} disabled={currentPage === 0}><ChevronLeft className="w-4 h-4 mr-1" /> Previous</button>
            <button className="danstyle1c-btn w-24 mx-1" onClick={() => handleNavigatePage(1)} disabled={currentPage >= totalPages - 1}>Next <ChevronRight className="w-4 h-4 ml-1" /></button>
          </div>
        )}

        {renderCurrentPlan()}
        
        {/* Multi-buttons below the grid */}
        {state.seatingPlans.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {/* Page number buttons */}
            {state.seatingPlans.length <= 7 ? (
              // Show all page numbers if 7 or fewer
              Array.from({ length: state.seatingPlans.length }, (_, i) => (
                <button
                  key={i}
                  className={`danstyle1c-btn w-8 mx-1 ${state.currentPlanIndex === i ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_CURRENT_PLAN_INDEX', payload: i })}
                >
                  {i + 1}
                </button>
              ))
            ) : (
              // Show pagination with ellipsis for many pages
              <>
                {/* First page */}
                <button
                  className={`danstyle1c-btn w-8 mx-1 ${state.currentPlanIndex === 0 ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_CURRENT_PLAN_INDEX', payload: 0 })}
                >
                  1
                </button>

                {/* Ellipsis if needed */}
                {state.currentPlanIndex > 2 && (
                  <span className="mx-2 text-gray-500">...</span>
                )}

                {/* Current page and neighbors */}
                {state.currentPlanIndex > 0 && (
                  <button
                    className="danstyle1c-btn w-8 mx-1"
                    onClick={() => dispatch({ type: 'SET_CURRENT_PLAN_INDEX', payload: state.currentPlanIndex - 1 })}
                  >
                    {state.currentPlanIndex}
                  </button>
                )}

                <button className="danstyle1c-btn w-8 mx-1 selected">
                  {state.currentPlanIndex + 1}
                </button>

                {state.currentPlanIndex < state.seatingPlans.length - 1 && (
                  <button
                    className="danstyle1c-btn w-8 mx-1"
                    onClick={() => dispatch({ type: 'SET_CURRENT_PLAN_INDEX', payload: state.currentPlanIndex + 1 })}
                  >
                    {state.currentPlanIndex + 2}
                  </button>
                )}

                {/* Ellipsis if needed */}
                {state.currentPlanIndex < state.seatingPlans.length - 3 && (
                  <span className="mx-2 text-gray-500">...</span>
                )}

                {/* Last page */}
                {state.currentPlanIndex < state.seatingPlans.length - 1 && (
                  <button
                    className={`danstyle1c-btn w-8 mx-1 ${state.currentPlanIndex === state.seatingPlans.length - 1 ? 'selected' : ''}`}
                    onClick={() => dispatch({ type: 'SET_CURRENT_PLAN_INDEX', payload: state.seatingPlans.length - 1 })}
                  >
                    {state.seatingPlans.length}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Guest pagination controls - bottom (matching Constraints page) */}
        {needsPagination && (
          <div className="flex flex-col md:flex-row items-center justify-between py-4 border-t mt-4">
            <div className="flex items-center w-full justify-between">
              <div className="pl-[140px]">
                <button onClick={() => handleNavigatePage(-1)} disabled={currentPage === 0} className="danstyle1c-btn w-24 mx-1">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </button>
              </div>
                <div className="flex flex-wrap justify-center">{renderPageNumbers()}</div>
                <div className="pr-[10px]">
                <button onClick={() => handleNavigatePage(1)} disabled={currentPage >= totalPages - 1} className="danstyle1c-btn w-24 mx-1">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bottom navigation buttons - preserved */}
        {plan && (
            <div className="mt-6 flex justify-center space-x-4">
                <button className="danstyle1c-btn" onClick={() => handleNavigatePlan(-1)} disabled={state.currentPlanIndex <= 0}><ArrowLeft className="w-4 h-4 mr-2" /> Previous</button>
                <button className="danstyle1c-btn" onClick={() => handleNavigatePlan(1)} disabled={state.currentPlanIndex >= state.seatingPlans.length - 1}>Next <ArrowRight className="w-4 h-4 ml-2" /></button>
            </div>
        )}
      </Card>
      <SavedSettingsAccordion isDefaultOpen={false} />
    </div>
  );
};

export default SeatingPlanViewer;