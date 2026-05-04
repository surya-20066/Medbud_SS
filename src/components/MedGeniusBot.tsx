import React from "react";

const MedGeniusBot: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[500px] bg-card overflow-hidden">
      <iframe
        src="https://med-genius-bot.lovable.app"
        className="w-full h-full border-0"
        title="Med Genius AI Bot"
        allow="clipboard-write; microphone"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
};

export default MedGeniusBot;
