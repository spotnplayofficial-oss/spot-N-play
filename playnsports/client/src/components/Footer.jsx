import { Mail, Phone, MapPin, Smartphone } from 'lucide-react';
import InstagramIcon from './icons/InstagramIcon.jsx';

// TODO: swap these placeholders for your real details before going live —
// Razorpay's reviewers (and your users) will actually click these.
const CONTACT_EMAIL = 'spotnplayofficial@gmail.com';
const CONTACT_PHONE = '+91 95712 10994';
const CONTACT_ADDRESS = 'Phagwara, Punjab, 144401 — India';
const INSTAGRAM_URL = 'https://instagram.com/spotnplayofficial';

const FooterColumn = ({ title, children }) => (
  <div>
    <p className="text-gray-900 dark:text-white text-xs font-semibold uppercase tracking-[0.15em] mb-4">{title}</p>
    <div className="flex flex-col gap-2.5">{children}</div>
  </div>
);

const FooterLink = ({ to, children }) => (
  <a href={to} className="text-gray-500 hover:text-green-400 text-sm transition-colors w-fit">
    {children}
  </a>
);

const Footer = () => (
  <footer className="border-t border-black/5 dark:border-white/5 pt-16 pb-8 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <p className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-3">SPOTNPLAY</p>
          <p className="text-gray-500 text-sm mb-5 max-w-xs">
            Find players near you, book premium grounds, and never miss a game again.
          </p>
          <div className="flex items-center gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="spotNplay on Instagram"
              className="w-9 h-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-gray-500 hover:text-green-400 hover:border-green-400/40 transition-colors"
            >
              <InstagramIcon size={16} />
            </a>
          </div>
        </div>

        <FooterColumn title="Company">
          <FooterLink to="/info#about">About Us</FooterLink>
          <FooterLink to="/careers">We Are Hiring</FooterLink>
          <FooterLink to="/collaborate">Collaborate</FooterLink>
          <FooterLink to="/info#contact-us">Contact Us</FooterLink>
        </FooterColumn>

        <FooterColumn title="Legal">
          <FooterLink to="/faq">FAQ</FooterLink>
          <FooterLink to="/info#privacy-policy">Privacy Policy</FooterLink>
          <FooterLink to="/info#terms-and-conditions">Terms &amp; Conditions</FooterLink>
          <FooterLink to="/info#refund-policy">Refund &amp; Cancellation Policy</FooterLink>
        </FooterColumn>

        <FooterColumn title="Get the App">
          <a href="/app-release.apk" download="SpotNPlay.apk" className="flex items-center gap-2 text-green-500 hover:text-green-400 text-sm transition-colors w-fit">
            <Smartphone size={15} className="flex-shrink-0" /> Download APK — Android
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-gray-500 hover:text-green-400 text-sm transition-colors w-fit">
            <Mail size={15} className="flex-shrink-0" /> {CONTACT_EMAIL}
          </a>
          <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="flex items-center gap-2 text-gray-500 hover:text-green-400 text-sm transition-colors w-fit">
            <Phone size={15} className="flex-shrink-0" /> {CONTACT_PHONE}
          </a>
        </FooterColumn>
      </div>

      <div className="flex items-start gap-2 text-gray-500 text-xs mb-8 max-w-2xl">
        <MapPin size={14} className="flex-shrink-0 mt-0.5" />
        <span>{CONTACT_ADDRESS}</span>
      </div>

      <div className="border-t border-black/5 dark:border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-gray-500 text-xs">© {new Date().getFullYear()} spotNplay — Built for players, by players.</p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <FooterLink to="/info#privacy-policy">Privacy</FooterLink>
          <FooterLink to="/info#terms-and-conditions">Terms</FooterLink>
          <FooterLink to="/info#refund-policy">Refunds</FooterLink>
          <FooterLink to="/info#contact-us">Contact</FooterLink>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
