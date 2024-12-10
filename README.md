<div align="center">
  <img src="https://media.pictify.io/mongoscope-logo.png" width="150" height="150">

  # MongoScope

  MongoScope is a simple, lightweight MongoDB analytics dashboard that provides insights into your MongoDB collections through an npm package.
</div>

![MongoScope Dashboard](https://media.pictify.io/mgsc-dashboard.png )

## Features ✨

- **Real-time Collection Analytics**: Monitor your MongoDB collections in real-time
- **Interactive Collection Selector**: Easy-to-use dropdown with search functionality
- **Responsive Design**: Works seamlessly across different screen sizes
- **HTMX Integration**: Smooth, dynamic updates without full page reloads
- **Chart.js Visualizations**: Beautiful, interactive data visualizations

## Installation 📦

```bash
npm install mongoscope
```

## Quick Start 🚀

```javascript
const MongoScope = require('mongoscope');

// Initialize MongoScope with your MongoDB connection
const mongoScope = new MongoScope({
    mongoUri: 'mongodb://localhost:27017/your-database',
    port: 3000 // Optional, defaults to 3000
});

// Start the server
mongoScope.start();
```

## Analytics Features 📊

MongoScope provides several types of analytics:

### 1. Collection Overview
- Total document count
- Collection size
- Average document size
- Storage statistics

### 2. Document Analytics
- Document size distribution
- Field frequency analysis
- Data type distribution
- Nested document depth analysis

### 3. Performance Metrics
- Index usage statistics
- Query patterns
- Write operations frequency
- Read/Write ratio

### 4. Time-Series Analysis
- Document growth over time
- Update frequency
- Access patterns
- Peak usage times



## UI Components 🎨

### Collection Selector
- Searchable dropdown for easy collection navigation
- Real-time filtering of collections
- Collection size indicators
- Responsive design for mobile devices

### Analytics Dashboard
- Grid layout for multiple analytics views
- Interactive charts and graphs
- Real-time updates
- Export capabilities for reports


## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💪

If you find any bugs or have feature requests, please create an issue in the GitHub repository.

## Acknowledgments 🙏

- Built with [HTMX](https://htmx.org/)
- Visualizations powered by [Chart.js](https://www.chartjs.org/)

---

Made with ❤️ by [@suyash-thakur](https://github.com/suyash-thakur)
