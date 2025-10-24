# StudySync Database
- СУБД: MongoDB ->add) v7.x.
- URI: process.env.MONGODB_URI (see .env.example).
- Доступ: app user (readWrite), admin (root).
- Резервирование: Daily snapshots в Atlas; целостность via indexes/validation в моделей.
- Перенос: MongoDB Compass/ajax для sample.json.
- Защита: TLS/JWT, шифрование AES-256.