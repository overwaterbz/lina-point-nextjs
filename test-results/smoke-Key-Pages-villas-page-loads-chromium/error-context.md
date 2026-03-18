# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - link "Skip to main content" [ref=e2] [cursor=pointer]:
        - /url: "#main-content"
    - main [ref=e3]:
        - generic [ref=e5]:
            - generic [ref=e6]: "404"
            - heading "Lost at Sea" [level=1] [ref=e7]
            - paragraph [ref=e8]: This page drifted away with the tide. Let's get you back to the resort.
            - generic [ref=e9]:
                - link "Back to Lina Point" [ref=e10] [cursor=pointer]:
                    - /url: /
                - link "View Rooms" [ref=e11] [cursor=pointer]:
                    - /url: /rooms
                - link "Book a Stay" [ref=e12] [cursor=pointer]:
                    - /url: /booking
    - link "Chat on WhatsApp" [ref=e14] [cursor=pointer]:
        - /url: https://wa.me/5016327767?text=Hi!%20I'm%20interested%20in%20booking%20a%20stay%20at%20Lina%20Point.%20Can%20you%20help%20me%20plan%20my%20trip%3F
        - img [ref=e15]
    - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
        - img [ref=e23]
    - alert [ref=e26]
```
