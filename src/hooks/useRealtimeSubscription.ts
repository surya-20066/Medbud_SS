import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeSubscriptionOptions {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  table,
  event = "*",
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const [status, setStatus] = useState<string>("idle");
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${filter || "all"}-${Date.now()}`;

    const channelConfig: any = {
      event,
      schema: "public",
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, (payload: any) => {
        // Call specific handler based on event type
        if (payload.eventType === "INSERT" && onInsert) {
          onInsert(payload);
        } else if (payload.eventType === "UPDATE" && onUpdate) {
          onUpdate(payload);
        } else if (payload.eventType === "DELETE" && onDelete) {
          onDelete(payload);
        }

        // Always call onChange if provided
        if (onChange) {
          onChange(payload);
        }
      })
      .subscribe((status: string) => {
        setStatus(status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, enabled]);

  return { status };
}
