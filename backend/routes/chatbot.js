const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const RULES = [
  { patterns: ['hello','hi','hey','hii'], response: `Hey there! 👋 I'm CampusBot, your AI assistant on CampusLink! How can I help you today? 😊`, replies: ['How to post?','How to connect?','How to earn points?'] },
  { patterns: ['post','create post','how to post','share'], response: `📝 **Creating a Post:**\n1. Go to the Feed page 🏠\n2. Write your message in the text box\n3. Pick type: Post / Question / Project / Event\n4. Add tags and hit Post ✨\n\nYou earn +5 points for every post! ⭐`, replies: ['How to earn points?','How to comment?'] },
  { patterns: ['connect','connection','add','friend'], response: `🤝 **How to Connect:**\n1. Go to Discover page 🔍\n2. Find students from other colleges\n3. Click Connect button\n4. They accept from their Profile\n\nOnce connected you can chat directly! 💬`, replies: ['How to chat?','How to discover?'] },
  { patterns: ['chat','message','dm','talk'], response: `💬 **Real-time Chat:**\n1. Go to Chat page 💬\n2. Search for any student\n3. Click to open chat\n4. Messages are instant! ⚡\n\nYou can see if they are online 🟢`, replies: ['How to connect?'] },
  { patterns: ['point','points','earn','reward','score'], response: `⭐ **How to Earn Points:**\n- Create a post → +5 points\n- Start a discussion → +10 points\n- Reply to discussion → +5 points\n- Get a like → +2 points\n- Get a comment → +1 point\n\nCheck Leaderboard to see your rank! 🏆`, replies: ['What are badges?','Show leaderboard'] },
  { patterns: ['discuss','forum','question','doubt'], response: `📢 **Using Discussions:**\n1. Go to Forum page\n2. Click + New Discussion\n3. Add title, category and content\n4. Others can reply!\n\nMark as Solved ✅ once answered.`, replies: ['How to earn points?'] },
  { patterns: ['discover','find','search','student'], response: `🔍 **Discovering Students:**\n- Go to Discover page\n- Search by name, college, branch\n- Filter by skills\n- Connect and collaborate!`, replies: ['How to connect?'] },
  { patterns: ['profile','edit','update','bio','skill'], response: `👤 **Editing Your Profile:**\n1. Click Profile in navbar\n2. Click Edit Profile ✏️\n3. Update bio, skills, interests\n4. Hit Save Changes 💾`, replies: ['How to earn points?'] },
  { patterns: ['notification','alert','bell'], response: `🔔 **Notifications:**\nYou get notified when someone:\n- Likes your post ❤️\n- Comments 💬\n- Sends connection request 🤝\n- Replies to your discussion ↩️` },
  { patterns: ['leaderboard','rank','top','best'], response: `🏆 **Leaderboard:**\nShows top students by points!\nTop 3 get special podium positions 🥇🥈🥉\n\nEarn points by posting and helping others!`, replies: ['How to earn points?'] },
  { patterns: ['project','collaboration','team','teammate'], response: `🚀 **Project Collaboration:**\n1. Create a Post with type Project 🚀\n2. Describe what you are building\n3. Add tech stack tags\n4. Interested students will connect!\n\nGreat for finding teammates! 💪`, replies: ['How to post?'] },
  { patterns: ['hackathon','event','competition'], response: `📅 **Events & Hackathons:**\n1. Create a post with type Event 📅\n2. Or post in Forum under Events\n3. Students from other colleges can join!\n\nMulti-college teams = winning teams! 🔥`, replies: ['How to post?'] },
  { patterns: ['badge','achievement'], response: `🏅 **Badges:**\nSpecial achievements for being active!\nThey show on your Profile and Leaderboard.\nKeep posting and helping to unlock them! 💪` },
  { patterns: ['internship','job','career','placement'], response: `💼 **Career Tips:**\n- Build a strong profile with skills\n- Connect with seniors from other colleges\n- Post questions in Discussions\n- Join project collaborations for portfolio\n\nKeep earning points — shows you are active! ⭐` },
  { patterns: ['ai','artificial','machine','deep learning'], response: `🤖 **Artificial Intelligence:**\nAI is the simulation of human intelligence by machines!\n\nOn CampusLink you can:\n- Find AI/ML students in Discover 🔍\n- Join AI project collaborations 🚀\n- Discuss AI topics in Forum 📢\n\nWant to connect with AI students? 😊`, replies: ['How to discover?','How to post?'] },
  { patterns: ['what','how','why','explain','tell'], response: `🤔 I am CampusBot — I know everything about CampusLink!\n\nAsk me about:\n- How to post, chat, connect\n- How to earn points and badges\n- How to find students\n- How to use discussions\n\nWhat would you like to know? 😊`, replies: ['How to post?','How to earn points?','How to connect?'] },
];

router.post('/', protect, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array required' });
    }

    const lastMessage = messages[messages.length - 1];
    const input = lastMessage.content.toLowerCase();

    let reply = '';
    let matched = false;

    for (const rule of RULES) {
      if (rule.patterns.some(p => input.includes(p))) {
        reply = rule.response;
        matched = true;
        break;
      }
    }

    if (!matched) {
      reply = `🤔 Hmm, I am not sure about that!\n\nTry asking me about:\n- How to post or chat\n- How to earn points\n- How to find students\n- How to use discussions\n\nOr visit the relevant page directly! 😊`;
    }

    res.json({ reply });

  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ message: 'Chatbot error. Please try again.' });
  }
});

module.exports = router;