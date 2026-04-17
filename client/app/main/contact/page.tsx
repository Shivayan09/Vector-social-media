export default function ContactPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black text-white">
      <div className="w-full max-w-xl bg-black/20 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/10">
        <h1 className="text-2xl font-bold mb-4 text-center">Contact Us</h1>

        <form className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Your Name"
            className="p-3 rounded-md bg-black/30 border border-white/20 focus:outline-none"
          />

          <input
            type="email"
            placeholder="Your Email"
            className="p-3 rounded-md bg-black/30 border border-white/20 focus:outline-none"
          />

          <textarea
            placeholder="Your Message"
            rows={4}
            className="p-3 rounded-md bg-black/30 border border-white/20 focus:outline-none"
          />

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 transition p-3 rounded-md font-semibold"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
