import React from 'react';
import { Settings, Sun, Moon } from 'lucide-react';
import { AppMode, ActionType } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface Props {
    show: boolean;
    onClose: () => void;
    dispatch: React.Dispatch<ActionType>;
    apiKey: string;
    setApiKey: (key: string) => void;
    isLightTheme: boolean;
    toggleTheme: () => void;
    onToggleDebug: () => void;
}

export const DebugMenu: React.FC<Props> = ({ 
    show, 
    onClose, 
    dispatch, 
    apiKey, 
    setApiKey, 
    isLightTheme, 
    toggleTheme,
    onToggleDebug
}) => {
    
    if (!show) {
        return (
            <div className="fixed top-32 right-4 z-[60]">
                <button 
                    onClick={onToggleDebug} 
                    className="bg-neuro-ui p-3 rounded-full text-gray-500 hover:text-neuro-text border-2 border-gray-700 backdrop-blur-sm pointer-events-auto"
                    aria-label="Open Debug Menu"
                >
                    <Settings size={24} strokeWidth={3} />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-4 border-black p-4 text-sm shadow-2xl text-black font-bold rounded-xl overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                <h3 className="uppercase text-xl">Simulator</h3>
                <button onClick={onClose} className="bg-black text-white p-2 rounded">CLOSE</button>
            </div>
            
            <div className="mb-6 flex justify-between items-center bg-gray-100 p-3 rounded border-2 border-black">
                <div className="flex items-center gap-2">
                   {isLightTheme ? <Sun size={20} /> : <Moon size={20} />}
                   <span>Theme: {isLightTheme ? 'Light' : 'Dark'}</span>
                </div>
                <button 
                    onClick={() => {
                        toggleTheme();
                        soundEngine.playModeSwitch();
                    }} 
                    className="bg-black text-white px-3 py-1 rounded uppercase text-xs"
                >
                    Toggle
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
               <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'STRAIGHT', distance: '10m' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">FWD</button>
               <button onClick={() => dispatch({ type: 'UPDATE_NAV', payload: { direction: 'LEFT', distance: 'Turn' }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">LEFT</button>
               <button onClick={() => dispatch({ type: 'UPDATE_READ', payload: { text: "Latte $4.00" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">READ</button>
               <button onClick={() => dispatch({ type: 'UPDATE_SCAN', payload: { objectName: "Soup Can", details: "Tomato" }})} className="bg-gray-200 p-3 hover:bg-yellow-300 border-2 border-black font-bold rounded">SCAN</button>
               <button onClick={() => dispatch({ type: 'TRIGGER_DANGER', payload: "Car Backing Up!" })} className="col-span-2 bg-[#FF4D00] text-white p-3 border-2 border-black font-black uppercase rounded">! DANGER !</button>
            </div>

            <div className="border-t-4 border-black pt-3">
              <label className="block mb-1 font-bold">API_KEY</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                className="w-full bg-gray-100 border-2 border-black p-3 text-black font-mono rounded"
              />
            </div>
          </div>
        </div>
    );
};