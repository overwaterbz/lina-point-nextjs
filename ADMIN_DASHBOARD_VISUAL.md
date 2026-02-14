# Admin Dashboard - Visual Overview

## `/admin/whatsapp` Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Admin Dashboard                            WhatsApp | Main Dashboard  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WhatsApp Management                                                   │
│  Monitor conversations and send messages                               │
│                                                                         │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐│
│  │   🟢 Active        │  │   💬 Recent        │  │  ✅ Today's      ││
│  │    Sessions        │  │    Messages        │  │    Messages      ││
│  │                    │  │                    │  │                  ││
│  │      12            │  │       50           │  │       23         ││
│  └────────────────────┘  └────────────────────┘  └──────────────────┘│
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Send Test Message                                              [Send]  │
├─────────────────────────────────────────────────────────────────────────┤
│  Phone Number:  [+1234567890________________]                          │
│  Message:       [Hello from Lina Point!_____]                          │
│                 [___________________________]                          │
│                 [___________________________]                          │
│                                                                         │
│                 [  Send Message  ]                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Active Sessions                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Phone Number      │ User        │ Last Message        │ Status        │
│  +1234567890       │ John Doe    │ 2 minutes ago      │ 🟢 Active     │
│  +9876543210       │ Jane Smith  │ 15 minutes ago     │ 🟢 Active     │
│  +5551234567       │ Guest       │ 1 hour ago         │ 🟢 Active     │
├─────────────────────────────────────────────────────────────────────────┤
│  Recent Messages                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────┐           │
│  │ +1234567890 [booking]               2:45 PM           │           │
│  │ I'd like to book a room for next weekend              │           │
│  └────────────────────────────────────────────────────────┘           │
│                                                                         │
│                ┌────────────────────────────────────────────────────┐  │
│                │ Maya                                    2:45 PM    │  │
│                │ I'd love to help you book! What dates are you     │  │
│                │ thinking? 🌴                                       │  │
│                └────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────┐           │
│  │ +9876543210 [magic]                  2:30 PM           │           │
│  │ Tell me about your magic experiences                   │           │
│  └────────────────────────────────────────────────────────┘           │
│                                                                         │
│                ┌────────────────────────────────────────────────────┐  │
│                │ Maya                                    2:30 PM    │  │
│                │ Our magic experiences create personalized songs &  │  │
│                │ videos for your special moments! ✨ Want me to     │  │
│                │ create one?                                        │  │
│                └────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Features Visible in UI

### Stats Cards (Top Section)
- **Active Sessions**: Shows count of ongoing conversations
- **Recent Messages**: Total messages in view
- **Today's Messages**: Messages received today
- Color-coded with icons (🟢 green for active, 💬 for messages, ✅ for today)

### Test Message Form (Middle Section)
- Phone number input (with format hint)
- Multi-line message textarea
- Send button with loading state
- Success/error toast notifications

### Active Sessions Table (Middle Section)
- Phone number display
- User name (or "Guest" if unregistered)
- Relative time of last message
- Status indicator (Active/Inactive)
- Sortable by last message time

### Recent Messages Feed (Bottom Section)
- Chat-like interface
- Left-aligned (inbound) and right-aligned (outbound) messages
- Phone number and timestamp for each message
- Intent tags (e.g., [booking], [magic]) when detected
- Color-coded bubbles:
  - Gray for inbound messages
  - Indigo/purple for outbound (Maya) messages
- Scrollable container (max height with scroll)

## Color Scheme

```
Primary Colors:
- Indigo/Purple (#4F46E5): Outbound messages, primary buttons
- Gray (#6B7280): Inbound messages, secondary text
- Green (#10B981): Success states, active indicators
- Blue (#3B82F6): Info states
- Red (#EF4444): Error states

Background:
- White (#FFFFFF): Card backgrounds
- Gray-50 (#F9FAFB): Page background
- Gray-100 (#F3F4F6): Inbound message background
```

## Responsive Design

### Desktop (> 768px)
- Three-column stats cards
- Full-width tables and forms
- Side-by-side chat bubbles

### Tablet (768px)
- Two-column stats cards
- Stacked tables
- Full-width messages

### Mobile (< 768px)
- Single-column stats cards
- Scrollable tables
- Compact message bubbles

## Interactive Elements

### Buttons
- Primary: "Send Message" (indigo, hover effect)
- Secondary: Navigation links (gray, hover effect)

### Forms
- Text input: Border on focus
- Textarea: Auto-resize
- Validation: Real-time feedback

### Tables
- Hover effect on rows
- Clickable rows (future enhancement)
- Responsive overflow scroll

### Messages
- Hover effect for actions (future)
- Copy message text (future)
- Reply/forward (future)

## Loading States

### Initial Load
```
┌─────────────────────────────────────┐
│                                     │
│         [Loading spinner]           │
│   Loading WhatsApp dashboard...     │
│                                     │
└─────────────────────────────────────┘
```

### Sending Message
```
[  Sending...  ]  (Disabled button with spinner)
```

### Empty States
```
┌─────────────────────────────────────┐
│  No active sessions                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  No messages yet                    │
└─────────────────────────────────────┘
```

## Accessibility

- Semantic HTML (table, form, nav)
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratios meet WCAG AA
- Focus indicators on all interactive elements

## Performance

- Client-side data fetching
- Auto-refresh every 30 seconds (future)
- Optimistic UI updates
- Pagination for large datasets (future)
- Lazy loading for message history

## Future Enhancements

- [ ] Real-time updates with WebSockets
- [ ] Message search and filtering
- [ ] Export conversation history
- [ ] Bulk messaging capabilities
- [ ] Advanced analytics dashboard
- [ ] User profile quick view
- [ ] Message templates library
- [ ] Scheduled message sending
