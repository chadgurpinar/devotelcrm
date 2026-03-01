import { useState } from "react";
import { Button, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { Meeting } from "../../store/types";
import { getCompanyName, getContactName, getUserName } from "../../store/selectors";
import { formatDay, formatTime } from "../../utils/datetime";

interface MeetingStartModalProps {
  eventId: string;
  meeting: Meeting;
  onClose: () => void;
}

export function MeetingStartModal({ eventId, meeting, onClose }: MeetingStartModalProps) {
  const store = useAppStore();
  const [noteText, setNoteText] = useState("");

  function onFinishMeeting() {
    const text = noteText.trim();
    if (!text) return;
    store.createNote({
      companyId: meeting.companyId,
      createdByUserId: store.activeUserId,
      text,
      relatedEventId: eventId,
      relatedMeetingId: meeting.id,
      relatedContactId: meeting.contactId,
    });
    store.updateMeeting({
      ...meeting,
      status: "Completed",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Start meeting</h3>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
          <p className="font-semibold text-slate-800">{getCompanyName(store, meeting.companyId)}</p>
          <p>
            {formatDay(meeting.startAt)} {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
          </p>
          <p>
            Owner: {getUserName(store, meeting.ownerUserId)} | Contact: {getContactName(store, meeting.contactId)} | Place: {meeting.place}
          </p>
        </div>

        <div className="mb-3">
          <FieldLabel>Meeting note</FieldLabel>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={6}
            placeholder="Write meeting notes..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onFinishMeeting} disabled={!noteText.trim()}>
            Finish meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
