// Single source of truth for every QR "type": the fields shown in the editor form,
// grouped the way QRfy groups its type picker (Website & links, Business, Contact,
// Connectivity, Media & files, Marketing).

const QR_TYPES = [
  {
    key: 'url', label: 'Website URL', icon: 'link', group: 'Website & links',
    description: 'Send people to any web page.',
    fields: [
      { name: 'url', label: 'Destination URL', type: 'url', placeholder: 'https://example.com', required: true },
    ],
  },
  {
    key: 'link-list', label: 'List of links', icon: 'list', group: 'Website & links',
    description: 'A link-in-bio style page with all your links in one place.',
    fields: [
      { name: 'title', label: 'Page title', type: 'text', placeholder: 'My Links', required: true },
      { name: 'bio', label: 'Short bio', type: 'textarea', placeholder: 'A short description...' },
      { name: 'links', label: 'Links', type: 'link-array', required: true },
    ],
  },
  {
    key: 'social', label: 'Social media', icon: 'share', group: 'Website & links',
    description: 'One page linking out to all your social profiles.',
    fields: [
      { name: 'title', label: 'Page title', type: 'text', placeholder: 'Follow us' },
      { name: 'links', label: 'Social profiles', type: 'social-array', required: true },
    ],
  },
  {
    key: 'business', label: 'Business page', icon: 'briefcase', group: 'Business',
    description: 'A digital profile page for your business.',
    fields: [
      { name: 'businessName', label: 'Business name', type: 'text', required: true },
      { name: 'tagline', label: 'Tagline', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'hours', label: 'Opening hours', type: 'textarea', placeholder: 'Mon-Fri 9am-6pm' },
    ],
  },
  {
    key: 'menu', label: 'Restaurant menu', icon: 'menu', group: 'Business',
    description: 'A digital, always up to date menu.',
    fields: [
      { name: 'restaurantName', label: 'Restaurant name', type: 'text', required: true },
      { name: 'items', label: 'Menu items', type: 'menu-array', required: true },
    ],
  },
  {
    key: 'coupon', label: 'Coupon', icon: 'tag', group: 'Business',
    description: 'Share a discount code or promo.',
    fields: [
      { name: 'title', label: 'Offer title', type: 'text', required: true },
      { name: 'code', label: 'Coupon code', type: 'text' },
      { name: 'description', label: 'Details', type: 'textarea' },
      { name: 'expiry', label: 'Expires on', type: 'date' },
    ],
  },
  {
    key: 'feedback', label: 'Feedback form', icon: 'star', group: 'Business',
    description: 'Collect quick feedback from a scan.',
    fields: [
      { name: 'title', label: 'Form title', type: 'text', placeholder: 'How did we do?', required: true },
      { name: 'questions', label: 'Questions', type: 'text-array', required: true },
    ],
  },
  {
    key: 'vcard', label: 'vCard', icon: 'contact', group: 'Contact',
    description: 'Share a digital business card / contact.',
    fields: [
      { name: 'firstName', label: 'First name', type: 'text', required: true },
      { name: 'lastName', label: 'Last name', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'jobTitle', label: 'Job title', type: 'text' },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'address', label: 'Address', type: 'text' },
    ],
  },
  {
    key: 'vcard-plus', label: 'vCard Plus', icon: 'id', group: 'Contact',
    description: 'An enhanced digital business card with more details.',
    fields: [
      { name: 'firstName', label: 'First name', type: 'text', required: true },
      { name: 'lastName', label: 'Last name', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'fax', label: 'Fax', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'jobTitle', label: 'Job title', type: 'text' },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'photoUrl', label: 'Photo URL', type: 'url' },
    ],
  },
  {
    key: 'email', label: 'Email', icon: 'mail', group: 'Contact',
    description: 'Open a pre-filled email.',
    fields: [
      { name: 'to', label: 'To', type: 'email', required: true },
      { name: 'subject', label: 'Subject', type: 'text' },
      { name: 'body', label: 'Message', type: 'textarea' },
    ],
  },
  {
    key: 'call', label: 'Phone call', icon: 'phone', group: 'Contact',
    description: 'Start a phone call.',
    fields: [{ name: 'phone', label: 'Phone number', type: 'tel', required: true }],
  },
  {
    key: 'sms', label: 'SMS', icon: 'message', group: 'Contact',
    description: 'Open a pre-filled text message.',
    fields: [
      { name: 'phone', label: 'Phone number', type: 'tel', required: true },
      { name: 'message', label: 'Message', type: 'textarea' },
    ],
  },
  {
    key: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', group: 'Contact',
    description: 'Open a pre-filled WhatsApp chat.',
    fields: [
      { name: 'phone', label: 'Phone number (with country code)', type: 'tel', required: true },
      { name: 'message', label: 'Message', type: 'textarea' },
    ],
  },
  {
    key: 'location', label: 'Location', icon: 'pin', group: 'Contact',
    description: 'Point to a place on the map.',
    fields: [
      { name: 'lat', label: 'Latitude', type: 'text', required: true },
      { name: 'lng', label: 'Longitude', type: 'text', required: true },
      { name: 'label', label: 'Place name', type: 'text' },
    ],
  },
  {
    key: 'event', label: 'Event', icon: 'calendar', group: 'Contact',
    description: 'Add an event to the calendar.',
    fields: [
      { name: 'title', label: 'Event title', type: 'text', required: true },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'start', label: 'Starts', type: 'datetime-local', required: true },
      { name: 'end', label: 'Ends', type: 'datetime-local' },
    ],
  },
  {
    key: 'wifi', label: 'WiFi', icon: 'wifi', group: 'Connectivity',
    description: 'Let people join your WiFi instantly.',
    fields: [
      { name: 'ssid', label: 'Network name (SSID)', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'text' },
      { name: 'encryption', label: 'Encryption', type: 'select', options: ['WPA', 'WEP', 'nopass'], default: 'WPA' },
      { name: 'hidden', label: 'Hidden network', type: 'checkbox' },
    ],
  },
  {
    key: 'app', label: 'App download', icon: 'app', group: 'Media & files',
    description: 'Smart-detect the visitor’s OS and send them to the right store.',
    fields: [
      { name: 'iosUrl', label: 'App Store URL', type: 'url' },
      { name: 'androidUrl', label: 'Google Play URL', type: 'url' },
      { name: 'fallbackUrl', label: 'Fallback URL', type: 'url' },
    ],
  },
  {
    key: 'pdf', label: 'PDF', icon: 'pdf', group: 'Media & files',
    description: 'Share a PDF document.',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'pdfUrl', label: 'PDF URL', type: 'url', required: true },
    ],
  },
  {
    key: 'images', label: 'Image gallery', icon: 'image', group: 'Media & files',
    description: 'Show off a gallery of images.',
    fields: [
      { name: 'title', label: 'Gallery title', type: 'text' },
      { name: 'imageUrls', label: 'Image URLs', type: 'text-array', required: true },
    ],
  },
  {
    key: 'video', label: 'Video', icon: 'video', group: 'Media & files',
    description: 'Play a video (YouTube, Vimeo or direct link).',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'videoUrl', label: 'Video URL', type: 'url', required: true },
    ],
  },
  {
    key: 'text', label: 'Plain text', icon: 'text', group: 'Media & files',
    description: 'Show a plain block of text.',
    fields: [{ name: 'text', label: 'Text', type: 'textarea', required: true }],
  },
];

function getType(key) {
  return QR_TYPES.find((t) => t.key === key);
}

module.exports = { QR_TYPES, getType };
