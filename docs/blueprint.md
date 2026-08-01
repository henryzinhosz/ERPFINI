# **App Name**: ShopFlow

## Core Features:

- User Authentication: Secure login page with role-based access control (admin, Park Shopping, Madureira Shopping) using the specified credentials.
- Stock Analysis Dashboard: Displays stock levels for each unit (Madureira and Park Shopping) in a searchable table (Name | Quantity | Type). Quantity indicators are color-coded (red/yellow/green) based on predefined thresholds for 'National' and 'Imported' categories. Access is restricted based on user role.
- Stock Management: Allows authorized personnel to record stock additions ('Entrada') and removals ('Saída'), including name with autocomplete functionality, quantity, date, operator, and action (dropdown selection). Automates stock updates based on recorded actions.
- Cash Flow Tracking: Enables recording daily sales across different payment methods (Dinheiro, Pix, Credito, Debito), and products; also registers outgoing expenses, defining value, status (paid/overdue/due), and notes; Displays customizable period reports.
- Configuration Panel: Allow users to specify their Payment Methods and Product Types, by means of simple CRUD screens.
- Cash Flow Report Generation: Generates an IA-powered closing report detailing total entries, total exits, payment method breakdowns, expense analysis, best selling products (Top 5), along with critical insights such as major spending area, best sales day, best selling product, most used payment method and calculates the potential earnings or losses.
- Stock Report Generation: Offers 3 distinct reports: a 'Best/Worst Selling Products' summary for the current month, an option to compare product trends for periods of 3, 6, or 12 months, and an exhaustive transaction log with filters for date, operator, item, and action type.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), instilling trust and reliability in financial and inventory data.
- Background color: Light grey (#F5F5F5) for a clean, neutral backdrop that ensures legibility and reduces visual fatigue.
- Accent color: Vibrant green (#4CAF50) for interactive elements and important metrics to draw the user's attention.
- Body text: 'PT Sans' (sans-serif) combines modernity with warmth. Headlines: 'PT Sans' as well.
- Consistent use of minimalist icons for navigation and data visualization, providing clear visual cues.
- Responsive design adaptable across devices (desktop, notebook, and mobile), emphasizing accessibility and ease of use.
- Subtle transitions and loading animations to enhance user experience without distracting from the data-rich interface.