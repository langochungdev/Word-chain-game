firestore
└── rooms (collection)
    └── {roomId} (document)
        ├── roomPin: string
        ├── targetScore: number
        ├── status: string
        ├── lastWord: string
        ├── winner (map)
        │   ├── id: string
        │   ├── name: string
        │   └── score: number
        ├── createdAt: timestamp
        ├── updatedAt: timestamp
        ├── players (subcollection)
        │   └── {playerId} (document)
        │       ├── name: string
        │       ├── score: number
        │       ├── joinedAt: timestamp
        │       ├── lastActiveAt: timestamp
        │       └── isOnline: boolean
        ├── messages (subcollection)
        │   └── {messageId} (document)
        │       ├── senderId: string
        │       ├── senderName: string
        │       ├── content: string
        │       ├── points: number
        │       ├── createdAt: timestamp
        │       └── type: string
        ├── usedWords (subcollection)
        │   └── {word} (document)
        │       ├── word: string
        │       ├── senderId: string
        │       └── createdAt: timestamp
        └── snapshots (subcollection)
            └── {snapshotId} (document)
                ├── targetScore: number
                ├── players (map)
                ├── scores (map)
                └── createdAt: timestamp
