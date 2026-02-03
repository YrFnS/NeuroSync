import React from 'react';
import { AppMode, NeuroState } from '../types';
import { NavigationMode } from './modes/NavigationMode';
import { ReadingMode } from './modes/ReadingMode';
import { ScanningMode } from './modes/ScanningMode';
import { DangerMode } from './modes/DangerMode';
import { GuardianMode } from './modes/GuardianMode';
import { IdleMode } from './modes/IdleMode';

interface Props {
  state: NeuroState;
}

export const LiquidDisplay: React.FC<Props> = ({ state }) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-black liquid-transition">
      {state.mode === AppMode.IDLE && <IdleMode />}
      {state.mode === AppMode.NAVIGATION && <NavigationMode data={state.navData} />}
      {state.mode === AppMode.READING && <ReadingMode data={state.readData} />}
      {state.mode === AppMode.SCANNING && <ScanningMode data={state.scanData} />}
      {state.mode === AppMode.DANGER && <DangerMode hazard={state.navData?.hazard || "Unknown Hazard"} />}
      {state.mode === AppMode.GUARDIAN && <GuardianMode data={state.guardianData} />}
    </div>
  );
};
