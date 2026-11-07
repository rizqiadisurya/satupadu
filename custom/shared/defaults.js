/* Default content per theme. The editor starts a new invitation from these,
   and a theme opened on its own renders them. Photo paths are relative to the theme folder. */
window.INVITE_DEFAULTS = {
  drapery: {
    theme: "drapery",
    slug: "arga-kirana",
    guestDefault: "Tamu Undangan",
    hashtag: "#KiranaArgaBersatu",
    music: { src: "" },
    couple: {
      bride: { name: "Kirana Larasati", short: "Kirana", parentsLine: "Putri kedua dari", father: "Hendra Wiratama", mother: "Sri Andayani", instagram: "kiranalaras", knownFor: "", bio: "" },
      groom: { name: "Arga Mahendra", short: "Arga", parentsLine: "Putra pertama dari", father: "Bambang Susilo", mother: "Ratna Dewi", instagram: "argamhndr", knownFor: "", bio: "" }
    },
    quote: {
      text: "“Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.”",
      source: "QS Ar-Rum : 21"
    },
    event: {
      date: "2026-12-12",
      akad: { time: "08.00 – 10.00 WIB", venue: "Gedung Graha Sawunggaling", address: "Jl. Kenanga Raya No. 18, Menteng,\nJakarta Pusat 10310" },
      resepsi: { time: "11.00 – 14.00 WIB", venue: "Gedung Graha Sawunggaling", address: "Jl. Kenanga Raya No. 18, Menteng,\nJakarta Pusat 10310" },
      mapsUrl: "https://maps.google.com/?q=Menteng+Jakarta+Pusat"
    },
    dresscode: { text: "Sage, dusty rose & ivory", label: "", colors: ["#9aa88a", "#d9a7b0", "#f4eee2"] },
    gift: {
      intro: "Doa restu dan kehadiran Anda adalah hadiah terindah bagi kami. Namun apabila Anda ingin memberikan tanda kasih, dapat melalui:",
      accounts: [
        { bank: "BCA", number: "7340 2219 85", holder: "Kirana Larasati" },
        { bank: "Mandiri", number: "1290 0087 4412", holder: "Arga Mahendra" }
      ],
      shipText: "Kado fisik dapat dikirim ke alamat berikut, lalu konfirmasi ke salah satu nomor di bawah:",
      address: "Jl. Cempaka Putih Tengah III No. 7, Jakarta Pusat 10510",
      contacts: [ { name: "Kirana", phone: "0812 4471 2093" }, { name: "Arga", phone: "0857 1120 3348" } ]
    },
    story: {
      title: "Love Story",
      items: [
        { title: "Awal Bertemu · 2019", text: "Kami pertama kali berkenalan di sebuah kelas fotografi akhir pekan di Kota Tua. Tidak ada yang istimewa hari itu — hanya pinjam-meminjam lensa dan obrolan singkat soal cahaya sore yang terlalu cepat hilang." },
        { title: "Tumbuh Bersama · 2021", text: "Dari jalan pagi di Car Free Day sampai perjalanan pertama ke Yogyakarta, kami belajar bahwa cocok bukan berarti selalu sama. Ada beda pendapat, ada sabar, dan ada banyak tawa di antaranya." },
        { title: "Lamaran · 2026", text: "Di hadapan kedua keluarga, kami menyatakan niat untuk melangkah bersama. Dengan syukur dan restu orang tua, kami memutuskan mengikat janji suci dan memulai babak baru." }
      ]
    },
    gallery: { caption: "" },
    closing: { text: "Merupakan suatu kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\nSampai jumpa di hari bahagia kami." },
    photos: {
      bride: "assets/foto/bride.jpg", groom: "assets/foto/groom.jpg",
      story1: "assets/foto/story1.jpg", story2: "assets/foto/story2.jpg",
      g1: "assets/foto/g1.jpg", g2: "assets/foto/g2.jpg", g3: "assets/foto/g3.jpg",
      g4: "assets/foto/g4.jpg", g5: "assets/foto/g5.jpg", g6: "assets/foto/g6.jpg"
    },
    sections: { quote: true, couple: true, date: true, countdown: true, event: true, dresscode: true, gift: true, rsvp: true, story: true, gallery: true, closing: true }
  },

  photobox: {
    theme: "photobox",
    slug: "raka-nadine",
    guestDefault: "you, our favourite person",
    hashtag: "#RAKAsamaNADINE",
    music: { src: "" },
    couple: {
      groom: { name: "Raka Aditya Pranata", short: "Raka", parentsLine: "", father: "Hendro Pranata", mother: "Lestari Wulandari", instagram: "", knownFor: "Fixing things at 2 a.m.",
        bio: "Quiet until you mention football, then impossible to stop. Makes a mean fried rice, keeps every receipt “just in case,” and still claims he was the one who texted first. He wasn’t." },
      bride: { name: "Nadine Salsabila Putri", short: "Nadine", parentsLine: "", father: "Faisal Rahman", mother: "Yuni Kartikasari", instagram: "", knownFor: "Planning trips, not packing",
        bio: "Laughs before the punchline, cries at every wedding video (including this one, probably), and owns more tote bags than shoes. Believes coffee is a personality and the cat is the real boss." }
    },
    quote: {
      text: "“And among His signs is this, that He created for you mates from among yourselves, that you may dwell in tranquillity with them, and He has put love and mercy between your hearts. Verily in that are signs for those who reflect.”",
      source: "— Ar-Rum : 21"
    },
    event: {
      date: "2027-01-17",
      akad: { time: "", venue: "", address: "" },
      resepsi: { time: "10:00 –\n13:00 WIB", venue: "RUMAH KAYU\nSENOPATI", address: "Jl. Senopati Raya No. 41, Selong, Kebayoran Baru,\nJakarta Selatan 12190" },
      mapsUrl: "https://maps.google.com/?q=Senopati+Jakarta+Selatan"
    },
    dresscode: { text: "Raka wanted everyone in black.\nNadine said absolutely not. So please come in…", label: "SAGE GREEN", colors: ["#8fa486"] },
    gift: {
      intro: "Honestly, you showing up is the gift. But if you’d still like to send something, we’re saving up for a slightly-too-ambitious honeymoon, and every bit helps.\n\nThank you, truly!",
      accounts: [ { bank: "BANK MANDIRI", number: "1370 0215 8846", holder: "Nadine S. P." } ],
      shipText: "Want to send a present instead? Message us on WhatsApp first and we’ll share the address.",
      address: "",
      contacts: [ { name: "Nadine", phone: "0812 8883 0417" }, { name: "Raka", phone: "0857 1006 2293" } ]
    },
    story: {
      title: "How it all started..",
      items: [
        { title: "", text: "It began with a wrong-number text about a lost umbrella.\nRaka replied “sorry, not mine.”\nNadine replied “ok but your profile pic is a cat??”" },
        { title: "", text: "Two years, one cat, and many umbrellas later,\nthe chat went from\n“lagi di mana?”" },
        { title: "", text: "to\n“jadi tenda nikahannya warna apa sih?”" }
      ]
    },
    gallery: { caption: "We tried a fancy prewedding shoot. We blinked in all of them. Here are our photobox strips and too many peace signs instead." },
    closing: { text: "We can’t wait to celebrate\nthe big day with you!" },
    photos: {
      player: "assets/foto/player.jpg", bride: "assets/foto/bride.jpg", groom: "assets/foto/groom.jpg",
      row1: "assets/foto/row1.jpg", row2: "assets/foto/row2.jpg", row3: "assets/foto/row3.jpg",
      g1: "assets/foto/g1.jpg", g2: "assets/foto/g2.jpg", g3: "assets/foto/g3.jpg", g4: "assets/foto/g4.jpg",
      strip1: "assets/foto/strip1.jpg", strip2: "assets/foto/strip2.jpg", strip3: "assets/foto/strip3.jpg", strip4: "assets/foto/strip4.jpg"
    },
    sections: { quote: true, couple: true, date: true, countdown: false, event: true, dresscode: true, gift: true, rsvp: false, story: true, gallery: true, closing: true }
  },
  coretan: {
    theme: "coretan",
    slug: "dimas-sekar",
    coverTitle: "Dua bocil ini resmi nikah!",
    guestDefault: "Tamu Undangan",
    hashtag: "#DariBocilJadiHalal",
    music: { src: "" },
    couple: {
      bride: { name: "Sekar Ayu Pertiwi", short: "Sekar", parentsLine: "Putri dari", father: "Joko Santoso", mother: "Nur Aini", instagram: "sekarayu", knownFor: "", bio: "" },
      groom: { name: "Dimas Prasetyo", short: "Dimas", parentsLine: "Putra dari", father: "Agus Wibowo", mother: "Lilis Suryani", instagram: "dimaspras", knownFor: "", bio: "" }
    },
    quote: {
      text: "“Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.”",
      source: "QS Ar-Rum: 21"
    },
    event: {
      date: "2027-03-20",
      akad: { time: "08.00 WIB", venue: "Masjid Al-Ikhlas Cipete", address: "Jl. Cipete Raya No. 12, Jakarta Selatan" },
      resepsi: { time: "11.00 – 14.00 WIB", venue: "Taman Kopi Cipete", address: "Jl. Kemang Selatan Raya No. 25,\nCilandak, Jakarta Selatan 12560" },
      mapsUrl: "https://maps.google.com/?q=Cipete+Jakarta+Selatan"
    },
    dresscode: { text: "Bebas rapi, asal nyaman buat joget.", label: "", colors: ["#8c1c13", "#f6f2ee"] },
    gift: {
      intro: "Doa restu kalian sudah lebih dari cukup.\nTapi kalau mau kasih tanda kasih, bisa lewat sini:",
      accounts: [
        { bank: "BCA", number: "5210 8834 17", holder: "Sekar Ayu Pertiwi" },
        { bank: "BNI", number: "0912 3347 7810", holder: "Dimas Prasetyo" }
      ],
      shipText: "Mau kirim kado fisik? Kabari kami dulu lewat WhatsApp ya.",
      address: "",
      contacts: [ { name: "Sekar", phone: "0813 1120 4471" }, { name: "Dimas", phone: "0857 8812 0093" } ]
    },
    story: {
      title: "Love Story",
      items: [
        { title: "TK Pelita · 2000", text: "Kami satu kelas di TK yang sama. Sekar selalu pinjam krayon merah Dimas dan tidak pernah dikembalikan." },
        { title: "Ketemu Lagi · 2019", text: "Dua puluh tahun kemudian, kami bertemu lagi di nikahan teman TK. Krayonnya masih dibahas, sampai sekarang." },
        { title: "Lamaran · 2026", text: "Kali ini Dimas yang meminjam sesuatu: hati Sekar. Dan katanya, yang ini tidak usah dikembalikan." }
      ]
    },
    gallery: { caption: "" },
    closing: { text: "Terima kasih sudah jadi bagian dari cerita kami sejak kecil.\nSampai jumpa di hari bahagia!" },
    photos: {
      cover: "assets/foto/cover.jpg", groom: "assets/foto/groom.jpg", bride: "assets/foto/bride.jpg", couple: "assets/foto/couple.jpg", player: "assets/foto/player.jpg",
      strip1: "assets/foto/strip1.jpg", strip2: "assets/foto/strip2.jpg", strip3: "assets/foto/strip3.jpg"
    },
    sections: { quote: true, couple: true, date: true, countdown: true, event: true, dresscode: false, gift: true, rsvp: true, story: true, gallery: true, closing: true }
  }
};
