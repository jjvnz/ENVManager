# 🔐 ENV Manager

A desktop application built with Electron for managing environment variables efficiently and securely.



<img width="1364" height="677" alt="image" src="https://github.com/user-attachments/assets/0fdc06dd-a2cb-475d-8b19-1873bda695b3" />


## ✨ Features

- **Project Management**: Create and organize multiple projects with their own environment variables
- **Visual Editor**: Intuitive interface to add, edit, and delete variables
- **Import/Export**: Compatible with standard `.env` files
- **Real-time Search**: Filter variables by key or value
- **Automatic Backups**: Automatic backup system before each save
- **Directory Scanning**: Automatically detects `.env` files in folders
- **Active/Inactive Variables**: Enable or disable variables without deleting them
- **Statistics**: View total, active, and disabled variables

## 🚀 Installation

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/jjvnz/ENVManager.git
cd ENVManager
```

2. Install dependencies:
```bash
npm install
```

3. Run the application in development mode:
```bash
npm start
```

## 📦 Build for Production

To create an executable of the application:

```bash
npm run build
```

## 🎯 Usage

### Create a New Project

1. Click **"➕ New"** in the sidebar
2. Enter the project name and an optional description
3. Click **"Create"**

### Import .env File

1. Select a project
2. Click **"📥 Import"**
3. Select the `.env` file you want to import
4. Variables will be loaded automatically

### Export Variables

1. Select a project
2. Click **"📤 Export"**
3. Choose the location to save the `.env` file
4. Only active variables will be exported

### Scan Directory

1. Click **"📁 Scan"** in the sidebar
2. Select a folder
3. All `.env*` files will be automatically detected
4. Projects will be created for each file found

### Manage Variables

- **Add**: Click **"➕ Add Variable"**
- **Edit**: Type directly in the KEY and VALUE fields
- **Enable/Disable**: Use the checkbox to the left of each variable
- **Duplicate**: Click the 📋 icon
- **Delete**: Click the 🗑️ icon
- **Search**: Use the search bar to filter variables

### Backups

1. Select a project
2. Click **"📦 Backups"**
3. You'll see a list of all available backups with dates
4. Click **"Restore"** to recover a previous version

## 🏗️ Project Structure

```
ENVManager/
├── main.js           # Electron main process
├── preload.js        # Preload script (contextBridge)
├── renderer.js       # User interface logic
├── index.html        # HTML interface
├── package.json      # Project configuration
└── README.md         # This file
```

## 🛠️ Technologies Used

- **Electron 39.0.0**: Framework for desktop applications
- **Node.js**: JavaScript runtime
- **HTML/CSS**: User interface
- **Vanilla JavaScript**: No additional frameworks

## 📁 Data Storage

Data is stored locally at:

- **Windows**: `%APPDATA%/env-manager/`
- **macOS**: `~/Library/Application Support/env-manager/`
- **Linux**: `~/.config/env-manager/`

Directory structure:
```
env-manager/
├── envs/          # Saved projects (.json)
└── backups/       # Automatic backups
```

## 🔒 Security

- ✅ **Context Isolation**: Enabled for enhanced security
- ✅ **Node Integration**: Disabled in renderer
- ✅ **HTML Escaping**: XSS prevention
- ✅ **Data Validation**: Complete null/undefined checks
- ✅ **Automatic Backups**: Before each save or deletion

## 🐛 Improvements and Optimizations

The application includes the following crash protections:

- Array validation before `.map()`, `.filter()`
- Null-safety in searches and filters
- Bounds checking on index access
- parseInt validation with NaN checks
- Try-catch in JSON parsing
- Safe handling of corrupted files

## 📝 .env File Format

Exported `.env` files follow the standard format:

```env
KEY1=value1
KEY2=value2
KEY_WITH_SPACES="value with spaces"
KEY_WITH_HASH="value # with hash"
```

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**dev** - [@jjvnz](https://github.com/jjvnz)

## 🙏 Acknowledgments

- Electron community
- All project contributors

---

⭐ If this project was useful to you, consider giving it a star on GitHub
