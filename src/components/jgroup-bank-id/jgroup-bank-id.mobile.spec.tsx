import { newSpecPage } from '@stencil/core/testing';
import { JgroupBankId } from './jgroup-bank-id';
import { mockPost } from '../../testing/axios-mock';

// The entire bug hunt that produced the other spec file started from a
// mobile-only symptom, yet every test there runs in the desktop 'qr' flow
// (jsdom's default user agent isn't mobile, and newSpecPage() resets
// navigator/location during its own setup anyway, so mocking the user
// agent beforehand doesn't reliably drive real device detection here).
// These tests instead force the component's own flowType/isMobileOrTablet
// state directly after mounting - is-mobile's own UA-sniffing accuracy is
// that library's concern, not this component's; what matters here is the
// 'app' flow's own logic once it's the one active: the same-device
// redirect to the BankID app, and resuming via the visibilitychange
// listener when the visitor comes back.
type Instance = InstanceType<typeof JgroupBankId>;

async function newMobileAuthPage() {
  const page = await newSpecPage({
    components: [JgroupBankId],
    html: '<jgroup-bank-id type="auth" auth-url="/auth" collect-url="/collect" cancel-url="/cancel"></jgroup-bank-id>',
  });

  const instance = page.rootInstance as Instance;
  instance.isMobileOrTablet = true;
  instance.flowType = 'app';
  await page.waitForChanges();

  return { page, instance };
}

function start(instance: Instance) {
  return (instance as unknown as { init(): Promise<void> }).init();
}

// Dispatching a real 'visibilitychange' event isn't reliable in this test
// harness (newSpecPage's mock document isn't consistently what @Listen
// binds to). Calling the handler directly tests the actual logic that
// matters here (does *this* method correctly decide to resume?),
// independent of Stencil's own @Listen wiring, which is the framework's
// concern, not this component's.
function triggerVisibilityChange(instance: Instance) {
  return (
    instance as unknown as { handleVisibilityChange(): void }
  ).handleVisibilityChange();
}

// jsdom doesn't implement real cross-origin navigation, so a plain
// assertion against window.location.href after assigning it isn't
// reliable. Spying on just the `href` setter - rather than replacing
// window.location outright - captures the assignment createReturnUrl()'s
// caller makes without disturbing the real Location object that
// history.pushState() (used elsewhere in the same flow) depends on.
function spyOnLocationHref() {
  return jest
    .spyOn(window.location, 'href', 'set')
    .mockImplementation(() => undefined);
}

function appInProgressMessageVisible(page: Awaited<ReturnType<typeof newSpecPage>>) {
  return (
    page.root!.shadowRoot!.querySelector(
      '[data-test-id="app-in-progress-message"]',
    ) !== null
  );
}

beforeEach(() => {
  mockPost.mockReset();
});

describe('jgroup-bank-id: starting on the app (mobile) flow', () => {
  it('emits started with the flow type, so consumers can tell app apart from qr', async () => {
    const { page, instance } = await newMobileAuthPage();
    const hrefSpy = spyOnLocationHref();
    const startedHandler = jest.fn();
    page.root!.addEventListener('started', startedHandler);

    mockPost.mockResolvedValueOnce({
      data: { autoStartToken: 'token', transactionId: 'txn-1' },
    });

    await start(instance);

    expect(startedHandler).toHaveBeenCalledTimes(1);
    expect(startedHandler.mock.calls[0][0].detail).toEqual({ flowType: 'app' });

    hrefSpy.mockRestore();
  });

  it('redirects to the BankID app instead of polling directly', async () => {
    const { instance } = await newMobileAuthPage();
    const hrefSpy = spyOnLocationHref();

    mockPost.mockResolvedValueOnce({
      data: {
        autoStartToken: 'the-auto-start-token',
        transactionId: 'txn-1',
      },
    });

    await start(instance);

    expect(hrefSpy).toHaveBeenCalledTimes(1);
    const redirectUrl = hrefSpy.mock.calls[0][0];
    expect(redirectUrl).toContain('https://app.bankid.com/');
    expect(redirectUrl).toContain('autostarttoken=the-auto-start-token');
    // The app flow hands off to the native app and resumes later via
    // visibilitychange - it must not have gone through pollCollect (and
    // therefore the collect-url) synchronously here.
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/auth');
    expect(instance.isInProgress).toBe(true);

    hrefSpy.mockRestore();
  });

  it('shows an in-progress message instead of an empty container', async () => {
    // Regression test: none of the other three render branches
    // (start buttons, status hint, qr image, cancel button) cover
    // isInProgress && flowType === 'app' with no hint yet - before this,
    // the whole widget rendered nothing at all for the entire time the
    // visitor is away in the native BankID app.
    const { page, instance } = await newMobileAuthPage();
    const hrefSpy = spyOnLocationHref();

    mockPost.mockResolvedValueOnce({
      data: { autoStartToken: 'token', transactionId: 'txn-1' },
    });

    await start(instance);
    await page.waitForChanges();

    expect(appInProgressMessageVisible(page)).toBe(true);

    hrefSpy.mockRestore();
  });
});

describe('jgroup-bank-id: resuming the app flow after returning from the BankID app', () => {
  it('resumes polling once the tab becomes visible again', async () => {
    const { page, instance } = await newMobileAuthPage();
    const hrefSpy = spyOnLocationHref();

    mockPost.mockResolvedValueOnce({
      data: { autoStartToken: 'token', transactionId: 'txn-1' },
    });

    await start(instance);

    // Confirms the premise of this test: after the app-flow redirect,
    // nothing has polled collect-url yet.
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(instance.isInProgress).toBe(true);

    mockPost.mockResolvedValueOnce({
      data: { status: 'complete', transactionId: 'txn-1', success: true },
    });

    // The resume check accepts either history.state.triggeredByUser or a
    // `#initiated=true` hash as proof the flow was genuinely started.
    // @stencil/core/mock-doc's MockHistory.pushState() is a hard no-op
    // (never actually sets .state), so this test drives it via the hash
    // instead - the same signal createReturnUrl()'s default branch
    // appends to the real BankID return URL for exactly this purpose.
    window.location.hash = '#initiated=true';

    triggerVisibilityChange(instance);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await page.waitForChanges();

    expect(mockPost).toHaveBeenCalledWith('/collect');
    expect(instance.isInProgress).toBe(false);
    expect(appInProgressMessageVisible(page)).toBe(false);

    hrefSpy.mockRestore();
  });

  it('does not resume if the flow was never actually started', async () => {
    const { instance } = await newMobileAuthPage();

    triggerVisibilityChange(instance);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPost).not.toHaveBeenCalled();
    expect(instance.isInProgress).toBe(false);
  });
});
