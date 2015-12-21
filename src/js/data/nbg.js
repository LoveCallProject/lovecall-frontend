module.exports = {
  "lovecall": 0,
  "metadata": {
    "song": {
      "title": "No brand girls",
      "artist": "μ's",
      "album": "No brand girls/START:DASH!!",
      "url": "nbg.mp3",
      "sources": {
        "fallback:": {
          "offset": 446
        },
        "md5:e187a61a59df0e86c11270e90ece5655": {
          "offset": 446
        },
        "md5:bcb045aefedbcdb68adb62424e5ea83b": {
          "offset": 832
        }
      },
      "timing": [
        [0, 197.0, 4, 4, 0]
      ]
    },
    "palette": [
    ]
  },
  "form": [
    [0, 0, 8, 0, "I"],
    [8, 0, 16, 0, "G0"],
    [16, 0, 32, 0, "A1"],
    [32, 0, 46, 0, "B1"],
    [46, 0, 60, 0, "C1"],
    [60, 0, 68, 0, "G1"],
    [68, 0, 90, 0, "A2"],
    [90, 0, 98, 0, "B2"],
    [98, 0, 116, 0, "C2"],
    [116, 0, 124, 0, "G2"],
    [124, 0, 140, 0, "G3"],
    [140, 0, 163, 0, "G4"],
    [163, 0, 168, 0, "S"],
    [168, 0, 182, 0, "C3"],
    [182, 0, 186, 0, "G5"],
    [186, 0, 194, 0, "G6"],
    [194, 0, -1, -1, "O"]
  ],
  "colors": [
  ],
  "sequences": {
    "hihihi": [
      [1, 0, 0, 0, 12, "快挥"],
      [1, 0, 0, 0, 4, "跟唱", "Hi!"],
      [1, 0, 4, 0, 8, "跟唱", "Hi!"],
      [1, 0, 8, 0, 12, "跟唱", "Hi!"]
    ],
    "nbg-chorus": [
      [2, 0, 0, "hihihi"],
      // TODO: ぐるぐる
      [2, 2, 0, "hihihi"],
      // TODO: ditto
      [1, 4, 0, 7, 8, "里跳", true],
      [1, 7, 8, 8, 0, "里跳", false],
      [2, 8, 0, "hihihi"],
      // TODO: ditto
      [2, 10, 0, "hihihi"],
      // TODO: 右〜左〜写真
    ]
  },
  "timeline": [
    [1, 16, 0, 24, 0, "前挥"],
    [2, 46, 0, "nbg-chorus"],
    [2, 98, 0, "nbg-chorus"],
    [1, 124, 0, 140, 0, "里跳", true],
    [2, 164, 0, "nbg-chorus"]
  ]
};
